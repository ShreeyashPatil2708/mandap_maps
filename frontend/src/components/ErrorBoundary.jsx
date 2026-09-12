import { Component } from 'react';

import Container from './Container.jsx';

// Last-resort guard: an unexpected render error shows a calm message instead
// of a blank white page. The fallback reuses the app's existing
// "Could not load pandals" styling.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Render error', error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="relative min-h-screen bg-cream">
        <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
          <div className="font-serif text-xl text-maroon">Something went wrong</div>
          <div className="font-sans text-sm text-maroon/50">
            Please refresh the page and try again.
          </div>
        </Container>
      </div>
    );
  }
}
