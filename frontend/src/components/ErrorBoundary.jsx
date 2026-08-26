import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-cream px-gutter text-center">
          <div className="font-serif text-xl text-maroon">Something went wrong</div>
          <div className="font-sans text-sm text-maroon/50">Please refresh the page.</div>
          <div className="font-devanagari text-[13px] text-maroon/35">पुन्हा प्रयत्न करा</div>
        </div>
      );
    }
    return this.props.children;
  }
}
