export default {
  logo: <span style={{ fontWeight: 'bold' }}>Georgian Bay General Hospital — Wiki</span>,
  project: {
    link: 'https://github.com/ianpilon/GBGH-Wiki-Site'
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – GBGH Wiki'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta name="description" content="Unofficial knowledge base for Georgian Bay General Hospital (Midland, ON). Compiled from gbgh.on.ca." />
    </>
  ),
  navigation: {
    prev: true,
    next: true
  },
  footer: {
    text: (
      <span>
        Unofficial GBGH wiki. Not affiliated with Georgian Bay General Hospital. Visit the official hospital website at{' '}
        <a
          href="https://gbgh.on.ca"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'underline' }}
        >
          gbgh.on.ca
        </a>
        . {new Date().getFullYear()}
      </span>
    ),
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
