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
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            AI Virtual Try-On
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload your photo and an image of a clothing item to see how it looks on you!
          </p>
        </div>

        {/* Main content card */}
        <div className="max-w-4xl mx-auto bg-card border border-border rounded-lg p-6 md:p-8">

          {/* Tips Section */}
          <div className="bg-muted/50 border border-border rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Tips for Best Results:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <ul className="space-y-2">
                <li>• Use a clear, front-facing photo with good lighting</li>
                <li>• Choose clothing images with the item clearly visible</li>
                <li>• Make sure your face is fully visible in your photo</li>
              </ul>
              <ul className="space-y-2">
                <li>• Avoid blurry or low-resolution images</li>
                <li>• Works best with simple backgrounds in both images</li>
                <li>• Processing typically takes 10-30 seconds</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* User Image Upload */}
              <div className="space-y-4">
                <label htmlFor="userImage" className="block text-lg font-medium text-foreground">
                  1. Upload Your Photo
                </label>
                <input
                  id="userImage"
                  name="userImage"
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/jpg"
                  onChange={(e) => handleFileChange(e, setUserImage, setUserImagePreview)}
                  ref={userFileInputRef}
                  className="block w-full text-sm text-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90 transition-colors
                    bg-input border border-border rounded-md p-3"
                  required
                />
                {userImagePreview && (
                  <div className="border border-border rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={userImagePreview} 
                      alt="User preview" 
                      className="w-full h-auto max-h-60 object-contain" 
                    />
                    <div className="p-3 bg-card">
                      <p className="text-sm text-muted-foreground text-center">Your Photo Preview</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Clothing Image Upload */}
              <div className="space-y-4">
                <label htmlFor="clothingImage" className="block text-lg font-medium text-foreground">
                  2. Upload Clothing Item
                </label>
                <input
                  id="clothingImage"
                  name="clothingImage"
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/jpg"
                  onChange={(e) => handleFileChange(e, setClothingImage, setClothingImagePreview)}
                  ref={clothingFileInputRef}
                  className="block w-full text-sm text-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-secondary file:text-secondary-foreground
                    hover:file:bg-secondary/90 transition-colors
                    bg-input border border-border rounded-md p-3"
                  required
                />
                {clothingImagePreview && (
                  <div className="border border-border rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={clothingImagePreview} 
                      alt="Clothing preview" 
                      className="w-full h-auto max-h-60 object-contain" 
                    />
                    <div className="p-3 bg-card">
                      <p className="text-sm text-muted-foreground text-center">Clothing Item Preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <p className="font-semibold text-destructive mb-1">Error:</p>
                <p className="text-destructive/80">{error}</p>
                {error.includes('safety') && (
                  <p className="text-sm mt-2 text-destructive/60">
                    Try using different images or ensure they meet content guidelines.
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-center gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading || !userImage || !clothingImage}
                className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-md 
                  hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed 
                  transition-colors duration-200"
              >
                {isLoading ? 'Generating...' : 'Try It On!'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-8 py-3 bg-secondary text-secondary-foreground font-semibold rounded-md 
                  hover:bg-secondary/90 transition-colors duration-200"
              >
                Reset
              </button>
            </div>
          </form>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="mt-8 text-center bg-muted/50 rounded-lg p-6 border border-border">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4"></div>
              <p className="text-foreground font-medium">
                Creating your virtual try-on...
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                This may take 10-30 seconds depending on image complexity
              </p>
            </div>
          )}

          {/* Generated Image Display */}
          {resultImageUrl && !isLoading && (
            <div className="mt-8 pt-6 border-t border-border">
              <h2 className="text-2xl font-semibold mb-6 text-center text-foreground">
                Virtual Try-On Result
              </h2>
              <div className="flex justify-center">
                <div className="border border-border rounded-lg overflow-hidden bg-muted">
                  <img
                    src={resultImageUrl}
                    alt="Virtual try-on result"
                    className="max-w-full h-auto"
                    style={{ maxHeight: '600px' }}
                  />
                  <div className="p-4 bg-card">
                    <p className="text-sm text-muted-foreground text-center">AI-Generated Try-On Result</p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      How do you like the fit? Try different clothing items!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
