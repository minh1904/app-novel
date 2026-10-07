// Runs before the first paint (a classic script in <head>; the CSP allows no inline script). When main
// opens the window with Windows acrylic behind it, it adds ?glass=1 to the URL; marking <html> here
// clears the page's background before anything is drawn, so the window never shows a solid frame first.
if (new URLSearchParams(window.location.search).get('glass') === '1') {
  document.documentElement.setAttribute('data-glass', '')
}
