import { useEffect, useState } from "react";

// Desktop = wide screen with a mouse. Phones, tablets and touch laptops in
// tablet mode (including an iPad in landscape) don't match.
const QUERY = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
};

export default useIsDesktop;
