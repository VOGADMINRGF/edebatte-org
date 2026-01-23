declare module "@/components/QuickRegister" {
  import * as React from "react";
  export type QuickRegisterSuccess = { userId: string; email?: string };
  export interface QuickRegisterProps {
    source?: string;
    onSuccess?: (p: QuickRegisterSuccess) => void;
    className?: string;
  }
  const QuickRegister: React.FC<QuickRegisterProps>;
  export default QuickRegister;
}
