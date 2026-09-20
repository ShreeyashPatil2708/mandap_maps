import { useState } from 'react';
import Container from '../components/Container.jsx';
import { parseRouteCode, routeCode } from '../context/RouteContext.jsx';
import { navigate, PATHS } from '../router.js';

// Code entry point for a route shared by a friend. A lead shares the /route
// link (or reads the code aloud); a visitor who was not handed the link can
// still join by typing the code here. The code is the ordered Ganpati ids as
// dashes ("1-5-3-7-9"), the same payload a share link carries as `?stops=`.

export default function Join({ enter = 'animate-fadeIn' }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const ids = parseRouteCode(code);
    if (!ids) {
      setError(
        'That code does not look like a route. A route code is numbers with dashes, like 1-5-3-7-9.'
      );
      return;
    }
    setError('');
    navigate(`${PATHS.route}?stops=${encodeURIComponent(routeCode(ids))}`);
  };

  return (
    <Container as="main" className={`${enter} pt-gutter`}>
      <div className="mx-auto max-w-prose">
        <div className="mb-6">
          <h1 className="font-serif text-2xl text-maroon">Join a Route</h1>
          <div className="mt-0.5 font-devanagari text-[13px] text-maroon/40" lang="mr">
            मित्राचा मार्ग सामील करा
          </div>
        </div>

        <div className="rounded-card border border-maroon/[0.06] bg-surface p-[24px]">
          <p className="mb-4 font-sans text-sm leading-[1.6] text-maroon/60">
            Ask a friend who has planned a darshan route to share it with you. Paste or type the
            route code here to load the same stops into your route.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setError('');
              }}
              placeholder="e.g. 1-5-3-7-9"
              inputMode="numeric"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Route code"
              className="rounded-card border-[1.5px] border-maroon/15 bg-cream px-4 py-3.5 font-sans text-base text-maroon outline-none placeholder:text-maroon/30 focus:border-gold"
            />
            {error && <div className="font-sans text-xs text-maroon">{error}</div>}
            <button
              type="submit"
              className="cursor-pointer rounded-card bg-gold px-7 py-3 font-sans text-sm font-semibold text-maroon hover:bg-gold-dark"
            >
              Load Route
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-card border border-maroon/[0.06] bg-surface p-[24px] text-center">
          <div className="font-serif text-lg text-maroon">Planning a route of your own?</div>
          <div className="mx-auto mt-1 mb-4 max-w-[420px] font-sans text-[13px] leading-[1.6] text-maroon/50">
            Pick pandals from Explore and build your darshan route, then share it so your friends
            can join.
          </div>
          <button
            type="button"
            onClick={() => navigate(PATHS.explore)}
            className="inline-block cursor-pointer rounded-pill bg-gold px-7 py-3 font-sans text-sm font-semibold text-maroon hover:bg-gold-dark"
          >
            Explore Pandals
          </button>
        </div>
      </div>
    </Container>
  );
}