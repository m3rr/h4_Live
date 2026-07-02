// Mock ComfyUI globals before importing
global.app = {
    registerExtension: jest.fn(),
    canvas: { ds: { scale: 1, offset: [0, 0] } },
    graph: { setDirtyCanvas: jest.fn() }
};

global.api = {
    fetchApi: jest.fn(),
    apiURL: jest.fn(route => route)
};

// Require the UI script (it will register the extension)
require('../web/h4_img_compress.js');

describe('Image Compressor UI Extension', () => {
    it('should register the extension with ComfyUI app', () => {
        expect(global.app.registerExtension).toHaveBeenCalled();
        
        const callArgs = global.app.registerExtension.mock.calls[0][0];
        expect(callArgs.name).toBe('h4.ImageCompressor.SmartSkin');
        expect(typeof callArgs.beforeRegisterNodeDef).toBe('function');
    });
});