/**
 * Utility to process, compress and convert uploaded image files to optimized Data URLs.
 * Keeps file size under ~150KB for smooth localStorage and Firestore storage.
 */
export async function processLogoFile(file: File, maxDimension: number = 400): Promise<string> {
  // If SVG, read as text/dataURL directly to preserve vector crispness
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Không thể đọc tệp SVG.'));
      reader.readAsDataURL(file);
    });
  }

  // For bitmaps (PNG, JPG, WEBP, GIF): resize and compress via Canvas
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Không thể tạo canvas context 2D.'));
          return;
        }

        // Draw transparent or white background if JPEG
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Keep transparency if PNG / WEBP
        const outputMime = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(outputMime, 0.9);

        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Tệp tải lên không phải là hình ảnh hợp lệ.'));
    };

    img.src = objectUrl;
  });
}
