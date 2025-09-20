import React, { useState, useEffect } from 'react';
import { AspectRatio, CameraPerspective, LightingStyle } from './types';
import { ASPECT_RATIO_OPTIONS, LIGHTING_STYLE_OPTIONS, CAMERA_PERSPECTIVE_OPTIONS } from './constants';
import { fileToBase64, generateDescriptivePrompt, editProductImage } from './services/geminiService';
import FileUpload from './components/FileUpload';
import SelectControl from './components/SelectControl';
import Spinner from './components/Spinner';
import Icon from './components/Icon';
import ImageCropModal from './components/ImageCropModal';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function App() {
  const [productImage, setProductImage] = useState<{ base64: string, mimeType: string } | null>(null);
  const [originalProductImage, setOriginalProductImage] = useState<{ dataUrl: string, mimeType: string } | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const [styleReferenceImage, setStyleReferenceImage] = useState<{ base64: string, mimeType: string } | null>(null);

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [lightingStyle, setLightingStyle] = useState<LightingStyle>(LightingStyle.STUDIO);
  const [cameraPerspective, setCameraPerspective] = useState<CameraPerspective>(CameraPerspective.EYE_LEVEL);

  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File, type: 'product' | 'style') => {
    setError(null);

    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      setError(`Unsupported file type. Please upload a JPEG, PNG, or WEBP image.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large. Please upload an image smaller than ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    try {
      if (type === 'product') {
        const { base64, mimeType } = await fileToBase64(file);
        setOriginalProductImage({
            dataUrl: `data:${mimeType};base64,${base64}`,
            mimeType: mimeType
        });
        setProductImage(null); // Clear previous crop
        setIsCropModalOpen(true);
      } else {
        const { base64, mimeType } = await fileToBase64(file);
        setStyleReferenceImage({ base64, mimeType });
      }
    } catch (err) {
      const error = err as Error;
      console.error(`Failed to process ${type} image:`, error);
      setError(`Error loading ${type} image: ${error.message}. Please try a different file.`);
    }
  };
  
  const handleCropSave = (croppedImage: { base64: string, mimeType: string }) => {
    setProductImage(croppedImage);
    setIsCropModalOpen(false);
  };

  const handleClearStyleImage = () => {
    setStyleReferenceImage(null);
  };

  useEffect(() => {
    const updatePrompt = async () => {
      setIsGeneratingPrompt(true);
      setError(null);
      try {
        const newPrompt = await generateDescriptivePrompt({
          aspectRatio,
          lightingStyle,
          cameraPerspective
        }, styleReferenceImage);
        setPrompt(newPrompt);
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'An unknown error occurred while generating the prompt.');
        console.error("Prompt generation failed:", error);
      } finally {
        setIsGeneratingPrompt(false);
      }
    };
    
    updatePrompt();
  }, [aspectRatio, lightingStyle, cameraPerspective, styleReferenceImage]);

  const handleGenerateImage = async () => {
    if (!productImage || !prompt) {
      setError('Please upload and crop a product image, and ensure a prompt is generated.');
      return;
    }
    setIsGeneratingImage(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const resultImage = await editProductImage(productImage, prompt, styleReferenceImage);
      setGeneratedImage(resultImage);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An unknown error occurred while generating the image.');
      console.error("Image generation failed:", error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'ai-photo-studio-result.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const getAspectRatioValue = (ar: AspectRatio): number => {
    switch (ar) {
      case AspectRatio.SQUARE: return 1 / 1;
      case AspectRatio.PORTRAIT: return 3 / 4;
      case AspectRatio.LANDSCAPE: return 16 / 9;
      default: return 1;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight flex items-center justify-center gap-3">
            <Icon type="wand" />
            AI Photo Studio
          </h1>
          <p className="mt-2 text-lg text-gray-400">Transform your product photos with Gemini</p>
        </header>

        {error && (
            <div className="w-full bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg flex items-center justify-between gap-4 mb-8" role="alert">
                <div className="flex items-center gap-3">
                    <Icon type="alert" className="w-6 h-6 flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
                <button
                    onClick={() => setError(null)}
                    className="text-red-200 hover:text-white transition-colors"
                    aria-label="Dismiss error message"
                >
                    <Icon type="close" className="w-5 h-5" />
                </button>
            </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Inputs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><Icon type="image" />Product Photo</h2>
              <FileUpload id="product-upload" onFileUpload={(file) => handleFileUpload(file, 'product')} label="Upload Main Image" />
              {productImage && (
                 <div className="mt-4">
                    <div className="rounded-lg overflow-hidden border-2 border-gray-700 h-64 flex items-center justify-center bg-gray-900/50">
                        <img src={`data:${productImage.mimeType};base64,${productImage.base64}`} alt="Product Preview" className="max-w-full max-h-full object-contain"/>
                    </div>
                     <button
                        onClick={() => setIsCropModalOpen(true)}
                        className="w-full mt-2 text-sm text-indigo-400 hover:text-indigo-300 font-semibold py-1 rounded"
                        aria-label="Change image crop"
                    >
                        Change Crop
                    </button>
                </div>
              )}
            </div>

             <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><Icon type="palette" />Style Reference (Optional)</h2>
              <FileUpload id="style-upload" onFileUpload={(file) => handleFileUpload(file, 'style')} label="Upload Style Image" />
               {styleReferenceImage && (
                <div className="relative mt-4">
                  <div className="rounded-lg overflow-hidden border-2 border-gray-700 h-64 flex items-center justify-center bg-gray-900/50">
                    <img src={`data:${styleReferenceImage.mimeType};base64,${styleReferenceImage.base64}`} alt="Style Reference Preview" className="max-w-full max-h-full object-contain"/>
                  </div>
                  <button
                    onClick={handleClearStyleImage}
                    className="absolute top-2 right-2 bg-gray-900 bg-opacity-60 text-white rounded-full p-1 hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white transition-colors"
                    aria-label="Remove style reference image"
                  >
                    <Icon type="close" className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Middle: Controls */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg h-full">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><Icon type="sliders" />Controls</h2>
              <div className="space-y-4">
                <SelectControl label="Aspect Ratio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} options={ASPECT_RATIO_OPTIONS} />
                <SelectControl label="Lighting Style" value={lightingStyle} onChange={(e) => setLightingStyle(e.target.value as LightingStyle)} options={LIGHTING_STYLE_OPTIONS} />
                <SelectControl label="Camera Perspective" value={cameraPerspective} onChange={(e) => setCameraPerspective(e.target.value as CameraPerspective)} options={CAMERA_PERSPECTIVE_OPTIONS} />
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <Icon type="sparkles" /> Generated Prompt
                </h3>
                 <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Prompt will be generated here..."
                    className="w-full h-48 p-3 bg-gray-900 border-2 border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                  {isGeneratingPrompt && <Spinner className="absolute top-3 right-3" />}
                </div>
              </div>
              <button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !productImage}
                className="w-full mt-6 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-105"
              >
                {isGeneratingImage ? <><Spinner /> Generating...</> : <><Icon type="generate" /> Generate Image</>}
              </button>
            </div>
          </div>

          {/* Right: Output */}
          <div className="lg:col-span-4">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg h-full flex flex-col">
               <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><Icon type="photo" />Result</h2>
              <div className="w-full aspect-square bg-gray-900 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-700 flex-grow">
                {isGeneratingImage && (
                  <div className="text-center">
                    <Spinner size="lg" />
                    <p className="mt-2 text-gray-400">Conjuring pixels... this can take a moment.</p>
                  </div>
                )}
                {!isGeneratingImage && generatedImage && (
                  <img src={generatedImage} alt="Generated result" className="w-full h-full object-contain rounded-lg"/>
                )}
                {!isGeneratingImage && !generatedImage && (
                   <div className="text-center text-gray-500">
                     <Icon type="photo" className="w-16 h-16 mx-auto mb-2" />
                     Your generated image will appear here.
                   </div>
                )}
              </div>
               {generatedImage && !isGeneratingImage && (
                <button
                  onClick={handleDownloadImage}
                  className="w-full mt-4 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
                  aria-label="Download generated image"
                >
                  <Icon type="download" className="w-5 h-5" />
                  <span>Download Image</span>
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
      {isCropModalOpen && originalProductImage && (
        <ImageCropModal
          imageSrc={originalProductImage.dataUrl}
          mimeType={originalProductImage.mimeType}
          aspect={getAspectRatioValue(aspectRatio)}
          onSave={handleCropSave}
          onClose={() => setIsCropModalOpen(false)}
        />
      )}
    </div>
  );
}