import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop automatically scrolls the window to the top (0, 0)
 * on route changes, preventing the browser from keeping scroll offset
 * from the previous page.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // If not navigating to detection section, smoothly/instantly scroll to top
    const params = new URLSearchParams(search);
    if (params.get("scrollTo") !== "detection") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname, search]);

  return null;
}
