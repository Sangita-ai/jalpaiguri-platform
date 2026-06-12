// packages/seed/wards.seed.ts
// 20 wards of Jalpaiguri Municipality, West Bengal
// Coordinates are approximate centroids around Jalpaiguri town (26.54°N, 88.72°E)

export const JALPAIGURI_CENTER = { lat: 26.5428, lng: 88.7179 };

export const WARDS = [
  { wardNumber: 1,  name: "Kadamtala",         lat: 26.5510, lng: 88.7050, population: 8200 },
  { wardNumber: 2,  name: "Deshbandhu Para",    lat: 26.5495, lng: 88.7110, population: 9100 },
  { wardNumber: 3,  name: "Rajbari",            lat: 26.5480, lng: 88.7180, population: 7800 },
  { wardNumber: 4,  name: "Station Para",       lat: 26.5460, lng: 88.7220, population: 10200 },
  { wardNumber: 5,  name: "Hospital Para",      lat: 26.5440, lng: 88.7260, population: 8900 },
  { wardNumber: 6,  name: "Netaji Para",        lat: 26.5420, lng: 88.7300, population: 7600 },
  { wardNumber: 7,  name: "Khagrabari",         lat: 26.5400, lng: 88.7340, population: 6800 },
  { wardNumber: 8,  name: "Ananda Para",        lat: 26.5380, lng: 88.7270, population: 9300 },
  { wardNumber: 9,  name: "Dinbazar",           lat: 26.5360, lng: 88.7210, population: 11200 },
  { wardNumber: 10, name: "Kotwali",            lat: 26.5340, lng: 88.7150, population: 10800 },
  { wardNumber: 11, name: "Rajganj Road",       lat: 26.5320, lng: 88.7090, population: 8400 },
  { wardNumber: 12, name: "Malopara",           lat: 26.5300, lng: 88.7030, population: 7200 },
  { wardNumber: 13, name: "Babu Para",          lat: 26.5360, lng: 88.6980, population: 9600 },
  { wardNumber: 14, name: "Kamat Para",         lat: 26.5400, lng: 88.6950, population: 8100 },
  { wardNumber: 15, name: "Santosh Para",       lat: 26.5440, lng: 88.6990, population: 7400 },
  { wardNumber: 16, name: "Kachhari Para",      lat: 26.5480, lng: 88.7020, population: 9800 },
  { wardNumber: 17, name: "Titu Para",          lat: 26.5520, lng: 88.7120, population: 6900 },
  { wardNumber: 18, name: "Bhagat Singh Colony",lat: 26.5560, lng: 88.7180, population: 8700 },
  { wardNumber: 19, name: "Purba Jalpaiguri",   lat: 26.5500, lng: 88.7280, population: 7300 },
  { wardNumber: 20, name: "Paschim Palli",      lat: 26.5460, lng: 88.7380, population: 6500 },
];

// Generate a simple polygon around a centroid
export function wardPolygon(lat: number, lng: number, radiusDeg: number = 0.008): number[][] {
  const steps = 6;
  const points: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const jitter = 0.7 + Math.random() * 0.6;
    points.push([
      +(lng + Math.cos(angle) * radiusDeg * jitter).toFixed(6),
      +(lat + Math.sin(angle) * radiusDeg * jitter).toFixed(6),
    ]);
  }
  points[steps] = points[0]; // close ring
  return points;
}
