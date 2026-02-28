# h4_faceforge/restore_helper.py
# Helper for face alignment and restoration
# Ported and simplified from generic FaceRestoreHelper

import cv2
import numpy as np
import os
import torch
from torchvision.transforms.functional import normalize

# Import face analysis from our utility (InsightFace wrapper)
from .nodes_utility import analyze_faces

# ==============================================================================
# Misc Utils (Ported from r_facelib.utils.misc)
# ==============================================================================

def imwrite(img, file_path, params=None, auto_mkdir=True):
    if auto_mkdir:
        dir_name = os.path.abspath(os.path.dirname(file_path))
        os.makedirs(dir_name, exist_ok=True)
    return cv2.imwrite(file_path, img, params)

def img2tensor(imgs, bgr2rgb=True, float32=True):
    def _totensor(img, bgr2rgb, float32):
        if img.shape[2] == 3 and bgr2rgb:
            if img.dtype == 'float64':
                img = img.astype('float32')
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = torch.from_numpy(img.transpose(2, 0, 1))
        if float32:
            img = img.float()
        return img

    if isinstance(imgs, list):
        return [_totensor(img, bgr2rgb, float32) for img in imgs]
    else:
        return _totensor(imgs, bgr2rgb, float32)

# ==============================================================================
# Helper Functions
# ==============================================================================

def get_largest_face(det_faces, h, w):
    def get_location(val, length):
        if val < 0: return 0
        elif val > length: return length
        else: return val

    face_areas = []
    # det_faces is list of tensors or arrays: [x1, y1, x2, y2, score, landmarks...]
    for det_face in det_faces:
        left = get_location(det_face[0], w)
        right = get_location(det_face[2], w)
        top = get_location(det_face[1], h)
        bottom = get_location(det_face[3], h)
        face_area = (right - left) * (bottom - top)
        face_areas.append(face_area)
    largest_idx = face_areas.index(max(face_areas))
    return det_faces[largest_idx], largest_idx

def get_center_face(det_faces, h=0, w=0, center=None):
    if center is not None:
        center = np.array(center)
    else:
        center = np.array([w / 2, h / 2])
    center_dist = []
    for det_face in det_faces:
        face_center = np.array([(det_face[0] + det_face[2]) / 2, (det_face[1] + det_face[3]) / 2])
        dist = np.linalg.norm(face_center - center)
        center_dist.append(dist)
    center_idx = center_dist.index(min(center_dist))
    return det_faces[center_idx], center_idx

# ==============================================================================
# Face Restore Helper Class
# ==============================================================================

class FaceRestoreHelper(object):
    """
    Helper for the face restoration pipeline.
    Adapted to use InsightFace results from nodes_utility.
    """

    def __init__(self, upscale_factor, face_size=512, crop_ratio=(1, 1),
                 det_model='retinaface_resnet50', save_ext='png', template_3points=False,
                 pad_blur=False, use_parse=False, device=None):
        
        self.template_3points = template_3points
        self.upscale_factor = upscale_factor
        self.crop_ratio = crop_ratio
        assert (self.crop_ratio[0] >= 1 and self.crop_ratio[1] >= 1), 'crop ratio only supports >=1'
        self.face_size = (int(face_size * self.crop_ratio[1]), int(face_size * self.crop_ratio[0]))

        if self.template_3points:
            self.face_template = np.array([[192, 240], [319, 240], [257, 371]])
        else:
            # Standard 5 landmarks for FFHQ faces with 512 x 512
            self.face_template = np.array([
                [192.98138, 239.94708], [318.90277, 240.1936], [256.63416, 314.01935],
                [201.26117, 371.41043], [313.08905, 371.15118]
            ])

        self.face_template = self.face_template * (face_size / 512.0)
        if self.crop_ratio[0] > 1:
            self.face_template[:, 1] += face_size * (self.crop_ratio[0] - 1) / 2
        if self.crop_ratio[1] > 1:
            self.face_template[:, 0] += face_size * (self.crop_ratio[1] - 1) / 2
            
        self.save_ext = save_ext
        self.pad_blur = pad_blur
        if self.pad_blur is True:
            self.template_3points = False

        self.all_landmarks_5 = []
        self.det_faces = []
        self.affine_matrices = []
        self.inverse_affine_matrices = []
        self.cropped_faces = []
        self.restored_faces = []
        self.pad_input_imgs = []

        if device is None:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            self.device = device
            
        # We do NOT init a separate detection model here.
        # We will assume detection is done externally or uses the shared InsightFace app.
        
        # Stub parsing for now (set use_parse=False to be safe)
        self.use_parse = False # Force false for now to avoid dependency on ParseNet
        self.face_parse = None

    def read_image(self, img):
        if isinstance(img, str):
            img = cv2.imread(img)

        if np.max(img) > 256:  # 16-bit
            img = img / 65535 * 255
        if len(img.shape) == 2:  # gray
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif img.shape[2] == 4:  # BGRA
            img = img[:, :, 0:3]

        self.input_img = img

        if min(self.input_img.shape[:2]) < 512:
            f = 512.0 / min(self.input_img.shape[:2])
            self.input_img = cv2.resize(self.input_img, (0, 0), fx=f, fy=f, interpolation=cv2.INTER_LINEAR)

    def get_face_landmarks_5(self, only_keep_largest=False, only_center_face=False,
                             resize=None, blur_ratio=0.01, eye_dist_threshold=None):
        if resize is None:
            scale = 1
            input_img = self.input_img
        else:
            h, w = self.input_img.shape[0:2]
            scale = resize / min(h, w)
            scale = max(1, scale)
            h, w = int(h * scale), int(w * scale)
            interp = cv2.INTER_AREA if scale < 1 else cv2.INTER_LINEAR
            input_img = cv2.resize(self.input_img, (w, h), interpolation=interp)

        # === REPLACED DETECTION LOGIC ===
        # Use our shared InsightFace analyzer instead of loading a new RetinaFace model
        from .nodes_utility import analyze_faces
        faces = analyze_faces(input_img)
        
        bboxes = []
        if faces:
            for face in faces:
                # Construct bbox + score + landmarks format
                # InsightFace face.bbox is [x1, y1, x2, y2]
                # InsightFace face.kps is 5x2 array
                
                # Append 5 landmarks flattened (x1, y1, x2, y2...)
                bbox_row = list(face.bbox) # 4 coords
                bbox_row.append(face.det_score) # score
                
                if face.kps is not None:
                    for pt in face.kps:
                        bbox_row.append(pt[0])
                        bbox_row.append(pt[1])
                else:
                    # Pad if no kps? Should check.
                    pass
                
                bboxes.append(np.array(bbox_row))
            
            bboxes = np.array(bboxes)
        else:
            bboxes = None
        # ================================

        if bboxes is None or len(bboxes) == 0:
            return 0
        else:
            bboxes = bboxes / scale

        for bbox in bboxes:
            # bbox layout: [x1, y1, x2, y2, score, lx, ly, rx, ry, nx, ny, lmx, lmy, rmx, rmy]
            
            if self.template_3points:
                landmark = np.array([[bbox[i], bbox[i + 1]] for i in range(5, 11, 2)])
            else:
                landmark = np.array([[bbox[i], bbox[i + 1]] for i in range(5, 15, 2)])
            
            self.all_landmarks_5.append(landmark)
            self.det_faces.append(bbox[0:5])

        if len(self.det_faces) == 0:
            return 0
            
        if only_keep_largest:
            h, w, _ = self.input_img.shape
            self.det_faces, largest_idx = get_largest_face(self.det_faces, h, w)
            self.all_landmarks_5 = [self.all_landmarks_5[largest_idx]]
        elif only_center_face:
            h, w, _ = self.input_img.shape
            self.det_faces, center_idx = get_center_face(self.det_faces, h, w)
            self.all_landmarks_5 = [self.all_landmarks_5[center_idx]]

        return len(self.all_landmarks_5)

    def align_warp_face(self, save_cropped_path=None, border_mode='constant'):
        for idx, landmark in enumerate(self.all_landmarks_5):
            affine_matrix = cv2.estimateAffinePartial2D(landmark, self.face_template, method=cv2.LMEDS)[0]
            self.affine_matrices.append(affine_matrix)
            
            if border_mode == 'constant': border_mode = cv2.BORDER_CONSTANT
            elif border_mode == 'reflect101': border_mode = cv2.BORDER_REFLECT101
            elif border_mode == 'reflect': border_mode = cv2.BORDER_REFLECT
            
            input_img = self.input_img # Pad blur handling skipped for simplicity
            
            cropped_face = cv2.warpAffine(
                input_img, affine_matrix, self.face_size, borderMode=border_mode, borderValue=(135, 133, 132))
            self.cropped_faces.append(cropped_face)

    def get_inverse_affine(self, save_inverse_affine_path=None):
        for idx, affine_matrix in enumerate(self.affine_matrices):
            inverse_affine = cv2.invertAffineTransform(affine_matrix)
            inverse_affine *= self.upscale_factor
            self.inverse_affine_matrices.append(inverse_affine)

    def add_restored_face(self, face):
        self.restored_faces.append(face)

    def paste_faces_to_input_image(self, save_path=None, upsample_img=None, draw_box=False, face_upsampler=None):
        h, w, _ = self.input_img.shape
        h_up, w_up = int(h * self.upscale_factor), int(w * self.upscale_factor)

        if upsample_img is None:
            upsample_img = cv2.resize(self.input_img, (w_up, h_up), interpolation=cv2.INTER_LINEAR)
        else:
            upsample_img = cv2.resize(upsample_img, (w_up, h_up), interpolation=cv2.INTER_LANCZOS4)

        if len(self.restored_faces) != len(self.inverse_affine_matrices):
            return upsample_img

        for restored_face, inverse_affine in zip(self.restored_faces, self.inverse_affine_matrices):
            if face_upsampler is not None:
                restored_face = face_upsampler.enhance(restored_face, outscale=self.upscale_factor)[0]
                inverse_affine /= self.upscale_factor
                inverse_affine[:, 2] *= self.upscale_factor
                face_size = (self.face_size[0]*self.upscale_factor, self.face_size[1]*self.upscale_factor)
            else:
                 if self.upscale_factor > 1:
                     extra_offset = 0.5 * self.upscale_factor
                 else:
                     extra_offset = 0
                 inverse_affine[:, 2] += extra_offset
                 face_size = self.face_size

            inv_restored = cv2.warpAffine(restored_face, inverse_affine, (w_up, h_up))
            
            # Simple square mask blending (since use_parse=False)
            mask = np.ones(face_size, dtype=np.float32)
            inv_mask = cv2.warpAffine(mask, inverse_affine, (w_up, h_up))
            inv_mask_erosion = cv2.erode(inv_mask, np.ones((int(2 * self.upscale_factor), int(2 * self.upscale_factor)), np.uint8))
            pasted_face = inv_mask_erosion[:, :, None] * inv_restored
            total_face_area = np.sum(inv_mask_erosion)
            
            # Compute fusion edge
            w_edge = int(total_face_area**0.5) // 20
            erosion_radius = w_edge * 2
            inv_mask_center = cv2.erode(inv_mask_erosion, np.ones((erosion_radius, erosion_radius), np.uint8))
            blur_size = w_edge * 2
            inv_soft_mask = cv2.GaussianBlur(inv_mask_center, (blur_size + 1, blur_size + 1), 0)
            
            if len(upsample_img.shape) == 2:
                upsample_img = upsample_img[:, :, None]
            inv_soft_mask = inv_soft_mask[:, :, None]

            if len(upsample_img.shape) == 3 and upsample_img.shape[2] == 4:
                alpha = upsample_img[:, :, 3:]
                upsample_img = inv_soft_mask * pasted_face + (1 - inv_soft_mask) * upsample_img[:, :, 0:3]
                upsample_img = np.concatenate((upsample_img, alpha), axis=2)
            else:
                upsample_img = inv_soft_mask * pasted_face + (1 - inv_soft_mask) * upsample_img

        return upsample_img.astype(np.uint8)

    def clean_all(self):
        self.all_landmarks_5 = []
        self.restored_faces = []
        self.affine_matrices = []
        self.cropped_faces = []
        self.inverse_affine_matrices = []
        self.det_faces = []
        self.pad_input_imgs = []
