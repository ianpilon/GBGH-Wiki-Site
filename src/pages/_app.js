import '../styles/globals.css'
import WikiChat from '../components/WikiChat'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <WikiChat />
    </>
  )
}
