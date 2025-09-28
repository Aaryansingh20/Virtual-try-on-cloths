'use client';

import { useState, ChangeEvent, FormEvent, useRef } from 'react';

export default function TryOnPage() {
  const [userImage, setUserImage] = useState<File | null>(null);
  const [clothingImage, setClothingImage] = useState<File | null>(null);
  const [userImagePreview, setUserImagePreview] = useState<string | null>(null);
  const [clothingImagePreview, setClothingImagePreview] = useState<string | null>(null);
  const [resultImageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for file inputs to allow resetting
  const userFileInputRef = useRef<HTMLInputElement>(null);
  const clothingFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    setImage: (file: File | null) => void,
    setPreview: (url: string | null) => void
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size too large. Please use images smaller than 10MB.');
        return;
      }

      setImage(file);
      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null); // Clear previous errors on new file selection
    } else {
      setImage(null);
      setPreview(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userImage || !clothingImage) {
      setError('Please upload both your photo and a clothing item image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setImageUrl(null); // Clear previous result

    const formData = new FormData();
    formData.append('userImage', userImage);
    formData.append('clothingImage', clothingImage);

    try {
      const response = await fetch('/api/tryon', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log("Frontend received result:", result);

      if (!response.ok) {
        throw new Error(result.error || `API Error: ${response.statusText}`);
      }

      if (result.image) {
        setImageUrl(result.image);
      } else {
        console.log("API response description:", result.description);
        console.log("API response:", result);
        throw new Error('API did not return a generated image. This might be due to safety filters or processing issues.');
      }

    } catch (err: unknown) {
      console.error('Submission Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during image generation.';
      setError(errorMessage);
      setImageUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUserImage(null);
    setClothingImage(null);
    setUserImagePreview(null);
    setClothingImagePreview(null);
    setImageUrl(null);
    setError(null);
    setIsLoading(false);
    // Reset file input fields
    if (userFileInputRef.current) userFileInputRef.current.value = '';
    if (clothingFileInputRef.current) clothingFileInputRef.current.value = '';
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-900 transition-colors duration-200">
      {/* Title */}
      <h1 className="text-4xl font-bold my-6 text-center text-white">
        AI Virtual Try-On
      </h1>

      {/* Main content card */}
      <main className="flex flex-grow flex-col items-center px-4 w-full">
        <div className="w-full max-w-4xl bg-gray-800 p-6 md:p-8 rounded-lg shadow-2xl border border-gray-700 transition-colors duration-200">

          <div className="text-center text-gray-300 mb-6">
            <p className="mb-4">
              Upload your photo and an image of a clothing item to see how it looks on you!
            </p>
            
            {/* Improved user guidance */}
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">📸 Tips for Best Results:</h3>
              <ul className="text-sm text-blue-200 space-y-1 text-left max-w-2xl mx-auto">
                <li>• Use a clear, front-facing photo of yourself with good lighting</li>
                <li>• Choose clothing images with the item clearly visible</li>
                <li>• Avoid blurry or low-resolution images</li>
                <li>• Make sure your face is fully visible in your photo</li>
                <li>• Works best with simple backgrounds in both images</li>
              </ul>
            </div>
            
            <small className="text-sm text-gray-400">
              AI generation quality may vary. Processing typically takes 10-30 seconds.
            </small>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Image Upload */}
              <div className="flex flex-col items-center space-y-3">
                <label htmlFor="userImage" className="block text-base font-medium text-gray-200">
                  1. Upload Your Photo
                </label>
                <input
                  id="userImage"
                  name="userImage"
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/jpg"
                  onChange={(e) => handleFileChange(e, setUserImage, setUserImagePreview)}
                  ref={userFileInputRef}
                  className="block w-full text-sm text-gray-300
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700 transition-colors
                    bg-gray-700 border border-gray-600 rounded-lg"
                  required
                />
                {userImagePreview && (
                  <div className="mt-4 border-2 border-gray-600 rounded-lg overflow-hidden shadow-lg bg-gray-700">
                    <img 
                      src={userImagePreview} 
                      alt="User preview" 
                      className="w-full h-auto max-h-60 object-contain bg-gray-800" 
                    />
                    <div className="p-2 bg-gray-700">
                      <p className="text-xs text-gray-300 text-center">Your Photo Preview</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Clothing Image Upload */}
              <div className="flex flex-col items-center space-y-3">
                <label htmlFor="clothingImage" className="block text-base font-medium text-gray-200">
                  2. Upload Clothing Item
                </label>
                <input
                  id="clothingImage"
                  name="clothingImage"
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/jpg"
                  onChange={(e) => handleFileChange(e, setClothingImage, setClothingImagePreview)}
                  ref={clothingFileInputRef}
                  className="block w-full text-sm text-gray-300
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-purple-600 file:text-white
                    hover:file:bg-purple-700 transition-colors
                    bg-gray-700 border border-gray-600 rounded-lg"
                  required
                />
                {clothingImagePreview && (
                  <div className="mt-4 border-2 border-gray-600 rounded-lg overflow-hidden shadow-lg bg-gray-700">
                    <img 
                      src={clothingImagePreview} 
                      alt="Clothing preview" 
                      className="w-full h-auto max-h-60 object-contain bg-gray-800" 
                    />
                    <div className="p-2 bg-gray-700">
                      <p className="text-xs text-gray-300 text-center">Clothing Item Preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <p className="font-semibold mb-1">❌ Error:</p>
                <p>{error}</p>
                {error.includes('safety') && (
                  <p className="text-xs mt-2 text-red-300">
                    Try using different images or ensure they meet content guidelines.
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-center pt-4 space-x-4">
              <button
                type="submit"
                disabled={isLoading || !userImage || !clothingImage}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out transform hover:scale-105"
              >
                {isLoading ? 'Generating...' : 'Try It On!'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-8 py-3 bg-gray-600 text-gray-100 font-semibold rounded-lg shadow-lg hover:bg-gray-500 transition duration-150 ease-in-out transform hover:scale-105"
              >
                Reset
              </button>
            </div>
          </form>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="mt-8 text-center bg-gray-700/50 rounded-lg p-6 border border-gray-600">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-400"></div>
              <p className="text-indigo-300 mt-4 text-sm font-medium">
                🎨 Creating your virtual try-on...
              </p>
              <p className="text-gray-400 text-xs mt-2">
                This may take 10-30 seconds depending on image complexity
              </p>
              <div className="mt-3 w-full bg-gray-600 rounded-full h-2">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
              </div>
            </div>
          )}

          {/* Generated Image Display */}
          {resultImageUrl && !isLoading && (
            <div className="mt-8 pt-6 border-t border-gray-600">
              <h2 className="text-2xl font-semibold mb-6 text-center text-white bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                ✨ Virtual Try-On Result
              </h2>
              <div className="flex justify-center">
                <div className="border-2 border-gray-600 rounded-xl overflow-hidden shadow-2xl bg-gray-700">
                  <img
                    src={resultImageUrl}
                    alt="Virtual try-on result"
                    className="max-w-full h-auto bg-gray-800"
                    style={{ maxHeight: '600px' }}
                  />
                  <div className="p-4 bg-gray-700">
                    <p className="text-sm text-gray-300 text-center">AI-Generated Try-On Result</p>
                    <p className="text-xs text-gray-400 text-center mt-1">
                      How do you like the fit? Try different clothing items!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}