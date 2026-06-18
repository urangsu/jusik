import React from "react";
import { THEME_COOKIE_NAME, DEFAULT_THEME } from "./theme-types";

/**
 * ThemeScript — Server Component.
 *
 * Renders an inline <script> that runs BEFORE the first paint.
 * It reads the kt-theme cookie and immediately sets data-theme on <html>,
 * eliminating the dark→light flash on page load.
 *
 * The script also handles "system" by checking prefers-color-scheme.
 *
 * This component must be placed inside <head> in layout.tsx.
 */
export function ThemeScript({ initialThemePreference }: { initialThemePreference?: string }) {
  // Build a small, inline script. We embed cookieName and default statically.
  const script = `(function(){
  var c='${THEME_COOKIE_NAME}';
  var d='${DEFAULT_THEME}';
  function resolve(t){
    if(t==='system'){
      return window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
    }
    return (t==='dark'||t==='light')?t:d;
  }
  function apply(t) {
    var resolved = resolve(t);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = t;
  }
  // 1. URL query
  var u=new URLSearchParams(window.location.search).get('theme');
  if(u==='dark'||u==='light'||u==='system'){apply(u);return;}
  // 2. Cookie
  var m=document.cookie.match(new RegExp('(?:^|;)\\\\s*'+c+'\\\\s*=\\\\s*([^;]+)'));
  if(m&&(m[1]==='dark'||m[1]==='light'||m[1]==='system')){apply(m[1]);return;}
  // 3. localStorage
  try{var s=localStorage.getItem(c);if(s==='dark'||s==='light'||s==='system'){apply(s);return;}}catch(e){}
  // 4. SSR value passed in
  var i='${initialThemePreference || DEFAULT_THEME}';
  apply(i);
})();`;

  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional no-flash theme script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
