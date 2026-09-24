export interface RoadMeta {
  id: string;
  name: string;
  area: string;
  ward: string;
  lat: number;
  lng: number;
}

export const ROADS: RoadMeta[] = [
  { id: "r1", name: "Anna Salai", area: "Teynampet", ward: "Teynampet", lat: 13.0512, lng: 80.2445 },
  { id: "r2", name: "GST Road", area: "Chromepet", ward: "Chromepet", lat: 12.9516, lng: 80.1462 },
  { id: "r3", name: "OMR Road", area: "Sholinganallur", ward: "Sholinganallur", lat: 12.9010, lng: 80.2279 },
  { id: "r4", name: "Mount Road", area: "Egmore", ward: "Egmore", lat: 13.0732, lng: 80.2609 },
  { id: "r5", name: "ECR Road", area: "Neelankarai", ward: "Neelankarai", lat: 12.9581, lng: 80.2571 },
  { id: "r6", name: "Anna Nagar 2nd Avenue", area: "Anna Nagar", ward: "Anna Nagar", lat: 13.0850, lng: 80.2101 },
  { id: "r7", name: "North Usman Road", area: "T. Nagar", ward: "T. Nagar", lat: 13.0418, lng: 80.2341 },
  { id: "r8", name: "Lattice Bridge Road", area: "Adyar", ward: "Adyar", lat: 13.0067, lng: 80.2570 },
  { id: "r9", name: "Velachery Main Road", area: "Velachery", ward: "Velachery", lat: 12.9756, lng: 80.2207 },
  { id: "r10", name: "Mount Poonamallee Road", area: "Porur", ward: "Porur", lat: 13.0359, lng: 80.1566 },
  { id: "r11", name: "Arcot Road", area: "Vadapalani", ward: "Vadapalani", lat: 13.0508, lng: 80.2130 },
  { id: "r12", name: "Nungambakkam High Road", area: "Nungambakkam", ward: "Nungambakkam", lat: 13.0569, lng: 80.2425 },
];
