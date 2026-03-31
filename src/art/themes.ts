export interface Theme {
  background: string;
  wireColor: string;
  ryGateColor: string;
  cxGateColor: string;
  cxDotColor: string;
  measureColor: string;
  textColor: string;
  labelColor: string;
  accentColor: string;
  fontFamily: string;
}

export const darkTheme: Theme = {
  background: '#0a0a0f',
  wireColor: '#2a2a3a',
  ryGateColor: '#4a90d9',
  cxGateColor: '#e74c3c',
  cxDotColor: '#e74c3c',
  measureColor: '#2ecc71',
  textColor: '#ffffff',
  labelColor: '#888899',
  accentColor: '#9b59b6',
  fontFamily: 'monospace',
};
