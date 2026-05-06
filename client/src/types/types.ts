export type UIResponse = {
  type: string;
  data: any;
  tone: string;
};

export type SpatialNode = {
  id: string;
  x: number;
  y: number;
  response: UIResponse;
};
