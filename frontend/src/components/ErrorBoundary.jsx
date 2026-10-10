import React from 'react'
import { AlertTriangle } from 'lucide-react'

// Without a boundary, any uncaught error while rendering a page (a bad id in the URL, a
// resource with an unexpected shape, etc.) unmounts the entire React tree and leaves a
// blank white screen with no clue why. This catches that, logs the real error to the
// console for debugging, and shows a recoverable screen instead of nothing.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Setu crashed while rendering:', error, info)
  }

  handleReset = () => {
    this.setState({ error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay/10 text-clay">
            <AlertTriangle size={22} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink">
              {localStorage.getItem('setu-language') === 'ta' ? 'இந்தப் பக்கத்தைக் காட்டும்போது பிழை ஏற்பட்டது' : 'Something went wrong showing this page'}
            </h1>
            <p className="mt-1.5 max-w-sm text-sm text-ink/55">
              {localStorage.getItem('setu-language') === 'ta'
                ? 'இது உங்கள் செயலால் ஏற்பட்டதல்ல; பயன்பாட்டில் பிழை ஏற்பட்டுள்ளது. பிழை உலாவி பதிவில் சேமிக்கப்பட்டுள்ளது. முகப்புக்குச் சென்று மீண்டும் முயற்சிக்கலாம்.'
                : 'This is a bug, not something you did. The error has been logged to the browser console. You can head back and try again.'}
            </p>
          </div>
          <button onClick={this.handleReset} className="btn-accent px-4 py-2 text-sm">
            {localStorage.getItem('setu-language') === 'ta' ? 'முகப்புக்குத் திரும்பு' : 'Back to home'}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
