// Shims für Build-Zeit, damit @ui ohne Next/Icons-Typen kompilierbar ist
declare module "next/link" {
  const Link: any;
  export default Link;
}

declare module "next/navigation" {
  export const usePathname: any;
  export const useRouter: any;
  export const useParams: any;
}

declare module "@context/LocaleContext" {
  export const useLocale: any;
  export const LocaleProvider: any;
  const _default: any;
  export default _default;
}

declare module "react-icons/fi" {
  export const FiMenu: any;
  export const FiX: any;
  export const FiUser: any;
  export const FiInfo: any;
  export const FiBookOpen: any;
  export const FiLogOut: any;
  export const FiXCircle: any;
  export const FiAlertTriangle: any;
  export const FiCheckCircle: any;
  export const FiChevronDown: any;
  export const FiShare2: any;
  export const FiEdit3: any;
  export const FiFlag: any;
  export const FiBookmark: any;
  export const FiDownload: any;
}
