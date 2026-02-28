# h4_faceforge/restore_arch.py
# Merged architecture file for GFPGAN from BasicSR/ReActor
# Includes StyleGAN2GeneratorClean and GFPGANv1Clean

import math
import random
import torch
from torch import nn
from torch.nn import functional as F
from torch.nn import init
from torch.nn.modules.batchnorm import _BatchNorm

# ==============================================================================
# Helper Layers
# ==============================================================================

@torch.no_grad()
def default_init_weights(module_list, scale=1, bias_fill=0, **kwargs):
    if not isinstance(module_list, list):
        module_list = [module_list]
    for module in module_list:
        for m in module.modules():
            if isinstance(m, nn.Conv2d):
                init.kaiming_normal_(m.weight, **kwargs)
                m.weight.data *= scale
                if m.bias is not None:
                    m.bias.data.fill_(bias_fill)
            elif isinstance(m, nn.Linear):
                init.kaiming_normal_(m.weight, **kwargs)
                m.weight.data *= scale
                if m.bias is not None:
                    m.bias.data.fill_(bias_fill)
            elif isinstance(m, _BatchNorm):
                init.constant_(m.weight, 1)
                if m.bias is not None:
                    m.bias.data.fill_(bias_fill)

class NormStyleCode(nn.Module):
    def forward(self, x):
        return x * torch.rsqrt(torch.mean(x**2, dim=1, keepdim=True) + 1e-8)

class ModulatedConv2d(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size, num_style_feat, demodulate=True, sample_mode=None, eps=1e-8):
        super(ModulatedConv2d, self).__init__()
        self.in_channels = in_channels
        self.out_channels = out_channels
        self.kernel_size = kernel_size
        self.demodulate = demodulate
        self.sample_mode = sample_mode
        self.eps = eps
        self.modulation = nn.Linear(num_style_feat, in_channels, bias=True)
        default_init_weights(self.modulation, scale=1, bias_fill=1, a=0, mode="fan_in", nonlinearity="linear")
        self.weight = nn.Parameter(torch.randn(1, out_channels, in_channels, kernel_size, kernel_size) / math.sqrt(in_channels * kernel_size**2))
        self.padding = kernel_size // 2

    def forward(self, x, style):
        b, c, h, w = x.shape
        style = self.modulation(style).view(b, 1, c, 1, 1)
        weight = self.weight * style
        if self.demodulate:
            demod = torch.rsqrt(weight.pow(2).sum([2, 3, 4]) + self.eps)
            weight = weight * demod.view(b, self.out_channels, 1, 1, 1)
        weight = weight.view(b * self.out_channels, c, self.kernel_size, self.kernel_size)
        if self.sample_mode == "upsample":
            x = F.interpolate(x, scale_factor=2, mode="bilinear", align_corners=False)
        elif self.sample_mode == "downsample":
            x = F.interpolate(x, scale_factor=0.5, mode="bilinear", align_corners=False)
        b, c, h, w = x.shape
        x = x.view(1, b * c, h, w)
        out = F.conv2d(x, weight, padding=self.padding, groups=b)
        out = out.view(b, self.out_channels, *out.shape[2:4])
        return out

class StyleConv(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size, num_style_feat, demodulate=True, sample_mode=None):
        super(StyleConv, self).__init__()
        self.modulated_conv = ModulatedConv2d(in_channels, out_channels, kernel_size, num_style_feat, demodulate=demodulate, sample_mode=sample_mode)
        self.weight = nn.Parameter(torch.zeros(1))
        self.bias = nn.Parameter(torch.zeros(1, out_channels, 1, 1))
        self.activate = nn.LeakyReLU(negative_slope=0.2, inplace=True)

    def forward(self, x, style, noise=None):
        out = self.modulated_conv(x, style) * 2**0.5
        if noise is None:
            b, _, h, w = out.shape
            noise = out.new_empty(b, 1, h, w).normal_()
        out = out + self.weight * noise
        out = out + self.bias
        out = self.activate(out)
        return out

class ToRGB(nn.Module):
    def __init__(self, in_channels, num_style_feat, upsample=True):
        super(ToRGB, self).__init__()
        self.upsample = upsample
        self.modulated_conv = ModulatedConv2d(in_channels, 3, kernel_size=1, num_style_feat=num_style_feat, demodulate=False, sample_mode=None)
        self.bias = nn.Parameter(torch.zeros(1, 3, 1, 1))

    def forward(self, x, style, skip=None):
        out = self.modulated_conv(x, style)
        out = out + self.bias
        if skip is not None:
            if self.upsample:
                skip = F.interpolate(skip, scale_factor=2, mode="bilinear", align_corners=False)
            out = out + skip
        return out

class ConstantInput(nn.Module):
    def __init__(self, num_channel, size):
        super(ConstantInput, self).__init__()
        self.weight = nn.Parameter(torch.randn(1, num_channel, size, size))

    def forward(self, batch):
        return self.weight.repeat(batch, 1, 1, 1)

class ResBlock(nn.Module):
    def __init__(self, in_channels, out_channels, mode="down"):
        super(ResBlock, self).__init__()
        self.conv1 = nn.Conv2d(in_channels, in_channels, 3, 1, 1)
        self.conv2 = nn.Conv2d(in_channels, out_channels, 3, 1, 1)
        self.skip = nn.Conv2d(in_channels, out_channels, 1, bias=False)
        self.scale_factor = 0.5 if mode == "down" else 2

    def forward(self, x):
        out = F.leaky_relu_(self.conv1(x), negative_slope=0.2)
        out = F.interpolate(out, scale_factor=self.scale_factor, mode="bilinear", align_corners=False)
        out = F.leaky_relu_(self.conv2(out), negative_slope=0.2)
        x = F.interpolate(x, scale_factor=self.scale_factor, mode="bilinear", align_corners=False)
        return out + self.skip(x)

# ==============================================================================
# StyleGAN2 Generator Clean
# ==============================================================================

class StyleGAN2GeneratorClean(nn.Module):
    def __init__(self, out_size, num_style_feat=512, num_mlp=8, channel_multiplier=2, narrow=1):
        super(StyleGAN2GeneratorClean, self).__init__()
        self.num_style_feat = num_style_feat
        style_mlp_layers = [NormStyleCode()]
        for i in range(num_mlp):
            style_mlp_layers.extend([nn.Linear(num_style_feat, num_style_feat, bias=True), nn.LeakyReLU(negative_slope=0.2, inplace=True)])
        self.style_mlp = nn.Sequential(*style_mlp_layers)
        default_init_weights(self.style_mlp, scale=1, bias_fill=0, a=0.2, mode="fan_in", nonlinearity="leaky_relu")

        channels = {
            "4": int(512 * narrow), "8": int(512 * narrow), "16": int(512 * narrow),
            "32": int(512 * narrow), "64": int(256 * channel_multiplier * narrow),
            "128": int(128 * channel_multiplier * narrow), "256": int(64 * channel_multiplier * narrow),
            "512": int(32 * channel_multiplier * narrow), "1024": int(16 * channel_multiplier * narrow),
        }
        self.channels = channels
        self.constant_input = ConstantInput(channels["4"], size=4)
        self.style_conv1 = StyleConv(channels["4"], channels["4"], kernel_size=3, num_style_feat=num_style_feat, demodulate=True, sample_mode=None)
        self.to_rgb1 = ToRGB(channels["4"], num_style_feat, upsample=False)

        self.log_size = int(math.log(out_size, 2))
        self.num_layers = (self.log_size - 2) * 2 + 1
        self.num_latent = self.log_size * 2 - 2
        self.style_convs = nn.ModuleList()
        self.to_rgbs = nn.ModuleList()
        self.noises = nn.Module()

        in_channels = channels["4"]
        for layer_idx in range(self.num_layers):
            resolution = 2 ** ((layer_idx + 5) // 2)
            self.noises.register_buffer(f"noise{layer_idx}", torch.randn(1, 1, resolution, resolution))

        for i in range(3, self.log_size + 1):
            out_channels = channels[f"{2**i}"]
            self.style_convs.append(StyleConv(in_channels, out_channels, kernel_size=3, num_style_feat=num_style_feat, demodulate=True, sample_mode="upsample"))
            self.style_convs.append(StyleConv(out_channels, out_channels, kernel_size=3, num_style_feat=num_style_feat, demodulate=True, sample_mode=None))
            self.to_rgbs.append(ToRGB(out_channels, num_style_feat, upsample=True))
            in_channels = out_channels

    def make_noise(self):
        device = self.constant_input.weight.device
        noises = [torch.randn(1, 1, 4, 4, device=device)]
        for i in range(3, self.log_size + 1):
            for _ in range(2):
                noises.append(torch.randn(1, 1, 2**i, 2**i, device=device))
        return noises

    def get_latent(self, x):
        return self.style_mlp(x)

    def mean_latent(self, num_latent):
        latent_in = torch.randn(num_latent, self.num_style_feat, device=self.constant_input.weight.device)
        return self.style_mlp(latent_in).mean(0, keepdim=True)

    def forward(self, styles, input_is_latent=False, noise=None, randomize_noise=True, truncation=1, truncation_latent=None, inject_index=None, return_latents=False):
        if not input_is_latent:
            styles = [self.style_mlp(s) for s in styles]
        if noise is None:
            noise = [None] * self.num_layers if randomize_noise else [getattr(self.noises, f"noise{i}") for i in range(self.num_layers)]
        if truncation < 1:
            styles = [truncation_latent + truncation * (style - truncation_latent) for style in styles]
        
        if len(styles) == 1:
            inject_index = self.num_latent
            latent = styles[0].unsqueeze(1).repeat(1, inject_index, 1) if styles[0].ndim < 3 else styles[0]
        elif len(styles) == 2:
            if inject_index is None:
                inject_index = random.randint(1, self.num_latent - 1)
            latent = torch.cat([styles[0].unsqueeze(1).repeat(1, inject_index, 1), styles[1].unsqueeze(1).repeat(1, self.num_latent - inject_index, 1)], 1)

        out = self.constant_input(latent.shape[0])
        out = self.style_conv1(out, latent[:, 0], noise=noise[0])
        skip = self.to_rgb1(out, latent[:, 1])

        i = 1
        for conv1, conv2, noise1, noise2, to_rgb in zip(self.style_convs[::2], self.style_convs[1::2], noise[1::2], noise[2::2], self.to_rgbs):
            out = conv1(out, latent[:, i], noise=noise1)
            out = conv2(out, latent[:, i + 1], noise=noise2)
            skip = to_rgb(out, latent[:, i + 2], skip)
            i += 2
        
        return (skip, latent) if return_latents else (skip, None)

# ==============================================================================
# StyleGAN2 Generator CSFT & GFPGANv1Clean
# ==============================================================================

class StyleGAN2GeneratorCSFT(StyleGAN2GeneratorClean):
    def __init__(self, out_size, num_style_feat=512, num_mlp=8, channel_multiplier=2, narrow=1, sft_half=False):
        super(StyleGAN2GeneratorCSFT, self).__init__(out_size, num_style_feat, num_mlp, channel_multiplier, narrow)
        self.sft_half = sft_half

    def forward(self, styles, conditions, input_is_latent=False, noise=None, randomize_noise=True, truncation=1, truncation_latent=None, inject_index=None, return_latents=False):
        if not input_is_latent:
            styles = [self.style_mlp(s) for s in styles]
        if noise is None:
            noise = [None] * self.num_layers if randomize_noise else [getattr(self.noises, f"noise{i}") for i in range(self.num_layers)]
        if truncation < 1:
            styles = [truncation_latent + truncation * (style - truncation_latent) for style in styles]
        
        if len(styles) == 1:
            inject_index = self.num_latent
            latent = styles[0].unsqueeze(1).repeat(1, inject_index, 1) if styles[0].ndim < 3 else styles[0]
        elif len(styles) == 2:
            if inject_index is None:
                inject_index = random.randint(1, self.num_latent - 1)
            latent = torch.cat([styles[0].unsqueeze(1).repeat(1, inject_index, 1), styles[1].unsqueeze(1).repeat(1, self.num_latent - inject_index, 1)], 1)

        out = self.constant_input(latent.shape[0])
        out = self.style_conv1(out, latent[:, 0], noise=noise[0])
        skip = self.to_rgb1(out, latent[:, 1])

        i = 1
        for conv1, conv2, noise1, noise2, to_rgb in zip(self.style_convs[::2], self.style_convs[1::2], noise[1::2], noise[2::2], self.to_rgbs):
            out = conv1(out, latent[:, i], noise=noise1)
            if i < len(conditions):
                if self.sft_half:
                    out_same, out_sft = torch.split(out, int(out.size(1) // 2), dim=1)
                    out_sft = out_sft * conditions[i - 1] + conditions[i]
                    out = torch.cat([out_same, out_sft], dim=1)
                else:
                    out = out * conditions[i - 1] + conditions[i]
            out = conv2(out, latent[:, i + 1], noise=noise2)
            skip = to_rgb(out, latent[:, i + 2], skip)
            i += 2
        
        return (skip, latent) if return_latents else (skip, None)

class GFPGANv1Clean(nn.Module):
    def __init__(self, state_dict):
        super(GFPGANv1Clean, self).__init__()
        self.input_is_latent = True
        self.different_w = True
        self.num_style_feat = 512
        num_mlp = 8
        narrow = 1
        sft_half = True
        channel_multiplier = 2

        self.log_size = int(math.log(512, 2))
        first_out_size = 2 ** (int(math.log(512, 2)))
        channels = {
            "4": int(512 * narrow), "8": int(512 * narrow), "16": int(512 * narrow),
            "32": int(512 * narrow), "64": int(256 * channel_multiplier * narrow),
            "128": int(128 * channel_multiplier * narrow), "256": int(64 * channel_multiplier * narrow),
            "512": int(32 * channel_multiplier * narrow), "1024": int(16 * channel_multiplier * narrow),
        }
        
        self.conv_body_first = nn.Conv2d(3, channels[f"{first_out_size}"], 1)
        in_channels = channels[f"{first_out_size}"]
        self.conv_body_down = nn.ModuleList()
        for i in range(self.log_size, 2, -1):
            out_channels = channels[f"{2**(i - 1)}"]
            self.conv_body_down.append(ResBlock(in_channels, out_channels, mode="down"))
            in_channels = out_channels
        self.final_conv = nn.Conv2d(in_channels, channels["4"], 3, 1, 1)

        in_channels = channels["4"]
        self.conv_body_up = nn.ModuleList()
        for i in range(3, self.log_size + 1):
            out_channels = channels[f"{2**i}"]
            self.conv_body_up.append(ResBlock(in_channels, out_channels, mode="up"))
            in_channels = out_channels

        self.toRGB = nn.ModuleList()
        for i in range(3, self.log_size + 1):
            self.toRGB.append(nn.Conv2d(channels[f"{2**i}"], 3, 1))

        self.final_linear = nn.Linear(channels["4"] * 4 * 4, 512 * 2 if self.different_w else 512)
        
        self.stylegan_decoder = StyleGAN2GeneratorCSFT(
            out_size=512, num_style_feat=512, num_mlp=num_mlp,
            channel_multiplier=channel_multiplier, narrow=narrow, sft_half=sft_half
        )
        
        self.condition_scale = nn.ModuleList()
        self.condition_shift = nn.ModuleList()
        for i in range(3, self.log_size + 1):
            out_channels = channels[f"{2**i}"]
            sft_out_channels = out_channels if sft_half else out_channels * 2
            self.condition_scale.append(nn.Sequential(nn.Conv2d(out_channels, out_channels, 3, 1, 1), nn.LeakyReLU(0.2, True), nn.Conv2d(out_channels, sft_out_channels, 3, 1, 1)))
            self.condition_shift.append(nn.Sequential(nn.Conv2d(out_channels, out_channels, 3, 1, 1), nn.LeakyReLU(0.2, True), nn.Conv2d(out_channels, sft_out_channels, 3, 1, 1)))
            
        self.load_state_dict(state_dict)

    def forward(self, x, return_latents=False, return_rgb=True, randomize_noise=True, **kwargs):
        conditions = []
        unet_skips = []
        out_rgbs = []
        
        feat = F.leaky_relu_(self.conv_body_first(x), negative_slope=0.2)
        for i in range(self.log_size - 2):
            feat = self.conv_body_down[i](feat)
            unet_skips.insert(0, feat)
        feat = F.leaky_relu_(self.final_conv(feat), negative_slope=0.2)
        
        style_code = self.final_linear(feat.view(feat.size(0), -1))
        if self.different_w:
            style_code = style_code.view(style_code.size(0), -1, self.num_style_feat)
            
        for i in range(self.log_size - 2):
            feat = feat + unet_skips[i]
            feat = self.conv_body_up[i](feat)
            scale = self.condition_scale[i](feat)
            conditions.append(scale.clone())
            shift = self.condition_shift[i](feat)
            conditions.append(shift.clone())
            if return_rgb:
                out_rgbs.append(self.toRGB[i](feat))
                
        image, _ = self.stylegan_decoder(
            [style_code], conditions, return_latents=return_latents,
            input_is_latent=self.input_is_latent, randomize_noise=randomize_noise
        )
        return image, out_rgbs
