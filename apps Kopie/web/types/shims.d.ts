// nur echte Shims, kein JSX überschreiben!
declare module "*.svg" {
    import * as React from "react";
    const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    export default ReactComponent;
  }
  declare module "*.css";
  