export interface NodeConfig {
      id: string;
      player?: 'RED' | 'BLUE';
      empty?: boolean;
    }
    
    export interface MovementRule {
      // Example: Linear, Jump, etc.
      type: string;
      // Custom logic or parameters
      params?: any;
    }
    
    export interface CaptureRule {
      // Example: Adjacent, Leap, etc.
      type: string;
      params?: any;
    }
    
    export interface BoardConfiguration {
      boardType: 'rectangle' | 'diamond' | 'custom';
      rows?: number;
      columns?: number;
      nodes: NodeConfig[];
      startingPositions: {
        RED: string[];
        BLUE: string[];
      };
      movementRules: MovementRule[];
      captureRules: CaptureRule[];
    }