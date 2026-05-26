export default {
  logo: <span style={{ fontWeight: 'bold' }}>Georgian Bay General Hospital — Wiki</span>,
  project: {
    link: 'https://gbgh.on.ca'
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – GBGH Wiki'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta name="description" content="Unofficial knowledge base for Georgian Bay General Hospital (Midland, ON). Compiled from gbgh.on.ca and public LinkedIn." />
    </>
  ),
  navigation: {
    prev: true,
    next: true
  },
  footer: {
    text: 'Unofficial GBGH wiki. Not affiliated with Georgian Bay General Hospital. ' + new Date().getFullYear()
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true
  },
  toc: {
    float: true,
    title: 'On This Page',
  },
  search: {
    placeholder: 'Search wiki (try a name)…'
  },
  darkMode: true,
}
