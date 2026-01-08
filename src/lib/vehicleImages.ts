import { supabase } from '@/lib/supabase';

interface VehiclePhoto {
  file_path: string;
  is_primary?: boolean;
}

// Demo vehicle images mapping
const demoImages: Record<string, string> = {
  // Sénégal
  'demo/toyota-corolla.jpg': '/demo-vehicles/toyota-corolla.jpg',
  'demo/renault-duster.jpg': '/demo-vehicles/renault-duster.jpg',
  'demo/peugeot-308.jpg': '/demo-vehicles/peugeot-308.jpg',
  'demo/hyundai-tucson.jpg': '/demo-vehicles/hyundai-tucson.jpg',
  'demo/mercedes-classe-e.jpg': '/demo-vehicles/mercedes-classe-e.jpg',
  'demo/suzuki-swift.jpg': '/demo-vehicles/suzuki-swift.jpg',
  'demo/toyota-land-cruiser.jpg': '/demo-vehicles/toyota-land-cruiser.jpg',
  'demo/kia-picanto.jpg': '/demo-vehicles/kia-picanto.jpg',
  // Côte d'Ivoire
  'demo/toyota-rav4.jpg': '/demo-vehicles/toyota-rav4.jpg',
  'demo/peugeot-3008.jpg': '/demo-vehicles/peugeot-3008.jpg',
  // Mali
  'demo/toyota-hilux.jpg': '/demo-vehicles/toyota-hilux.jpg',
  'demo/nissan-patrol.jpg': '/demo-vehicles/nissan-patrol.jpg',
  // Burkina Faso
  'demo/honda-crv.jpg': '/demo-vehicles/honda-crv.jpg',
  'demo/mitsubishi-pajero.jpg': '/demo-vehicles/mitsubishi-pajero.jpg',
  // Niger
  'demo/toyota-prado.jpg': '/demo-vehicles/toyota-prado.jpg',
  'demo/ford-ranger.jpg': '/demo-vehicles/ford-ranger.jpg',
  // Togo
  'demo/vw-tiguan.jpg': '/demo-vehicles/vw-tiguan.jpg',
  'demo/hyundai-santafe.jpg': '/demo-vehicles/hyundai-santafe.jpg',
  // Bénin
  'demo/kia-sportage.jpg': '/demo-vehicles/kia-sportage.jpg',
  'demo/mazda-cx5.jpg': '/demo-vehicles/mazda-cx5.jpg',
  // Guinée-Bissau
  'demo/suzuki-vitara.jpg': '/demo-vehicles/suzuki-vitara.jpg',
  'demo/dacia-duster.jpg': '/demo-vehicles/dacia-duster.jpg',
};

// Default placeholder image
const placeholderImage = '/placeholder.svg';

/**
 * Get the image URL for a vehicle photo
 * Handles both demo images (stored locally) and real images (stored in Supabase storage)
 */
export function getVehicleImageUrl(filePath: string): string {
  // Check if it's a demo image
  if (filePath.startsWith('demo/')) {
    return demoImages[filePath] || placeholderImage;
  }
  
  // Otherwise, get from Supabase storage
  const { data } = supabase.storage.from('vehicle-photos').getPublicUrl(filePath);
  return data?.publicUrl || placeholderImage;
}

/**
 * Get the primary image URL for a vehicle from its photos array
 */
export function getVehiclePrimaryImage(photos: VehiclePhoto[] | undefined | null): string {
  if (!photos || photos.length === 0) {
    return placeholderImage;
  }
  
  const primaryPhoto = photos.find(p => p.is_primary);
  const photoPath = primaryPhoto?.file_path || photos[0]?.file_path;
  
  if (!photoPath) {
    return placeholderImage;
  }
  
  return getVehicleImageUrl(photoPath);
}

/**
 * Get all image URLs for a vehicle from its photos array
 */
export function getAllVehicleImages(photos: VehiclePhoto[] | undefined | null): string[] {
  if (!photos || photos.length === 0) {
    return [placeholderImage];
  }
  
  return photos.map(photo => getVehicleImageUrl(photo.file_path));
}
