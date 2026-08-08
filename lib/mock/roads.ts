export interface MockRoad {
  id: string;
  name: string;
  area: string;
  ward: string;
  city: string;
  lat: number;
  lng: number;
}

// Demo/mock coordinates only — not real detected defects.
export const ROADS: MockRoad[] = [
  { id: "r1", name: "Anna Salai", area: "Teynampet", ward: "Ward 118", city: "Chennai", lat: 13.0524, lng: 80.2508 },
  { id: "r2", name: "GST Road", area: "Chromepet", ward: "Ward 178", city: "Chennai", lat: 12.9516, lng: 80.1462 },
  { id: "r3", name: "OMR Road", area: "Sholinganallur", ward: "Ward 190", city: "Chennai", lat: 12.9010, lng: 80.2279 },
  { id: "r4", name: "Mount Road", area: "Egmore", ward: "Ward 100", city: "Chennai", lat: 13.0732, lng: 80.2609 },
  { id: "r5", name: "ECR Road", area: "Neelankarai", ward: "Ward 200", city: "Chennai", lat: 12.9520, lng: 80.2565 },
  { id: "r6", name: "Anna Nagar 2nd Avenue", area: "Anna Nagar", ward: "Ward 90", city: "Chennai", lat: 13.0850, lng: 80.2101 },
  { id: "r7", name: "North Usman Road", area: "T. Nagar", ward: "Ward 130", city: "Chennai", lat: 13.0418, lng: 80.2341 },
  { id: "r8", name: "Lattice Bridge Road", area: "Adyar", ward: "Ward 175", city: "Chennai", lat: 13.0067, lng: 80.2570 },
  { id: "r9", name: "Velachery Main Road", area: "Velachery", ward: "Ward 182", city: "Chennai", lat: 12.9791, lng: 80.2211 },
  { id: "r10", name: "Mount Poonamallee Road", area: "Porur", ward: "Ward 141", city: "Chennai", lat: 13.0378, lng: 80.1565 },
  { id: "r11", name: "Arcot Road", area: "Vadapalani", ward: "Ward 145", city: "Chennai", lat: 13.0503, lng: 80.2121 },
  { id: "r12", name: "Nungambakkam High Road", area: "Nungambakkam", ward: "Ward 112", city: "Chennai", lat: 13.0569, lng: 80.2425 },
];

export function roadById(id: string) {
  return ROADS.find((r) => r.id === id)!;
}
