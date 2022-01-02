import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from 'remix';
import type { MetaFunction, LinksFunction } from 'remix';

import globalStyles from './styles/global.css';
import mobileStyles from './styles/mobile.css';
import tabletStyles from './styles/tablet.css';
import desktopStyles from './styles/desktop.css';
import darkTheme from './styles/darkTheme.css';

export const meta: MetaFunction = () => {
  return { title: 'Ashmortar.dev' };
};

export const links: LinksFunction = () => {
  return [
    {
      rel: 'stylesheet',
      href: globalStyles,
    },
    {
      rel: 'stylesheet',
      href: mobileStyles,
      media: '(min-width: 480px)',
    },
    {
      rel: 'stylesheet',
      href: tabletStyles,
      media: '(min-width: 768px)',
    },
    {
      rel: 'stylesheet',
      href: desktopStyles,
      media: '(min-width: 1024px)',
    },
    {
      rel: 'stylesheet',
      href: darkTheme,
      media: '(prefers-color-scheme: dark)',
    },
  ];
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        {process.env.NODE_ENV === 'development' && <LiveReload />}
      </body>
    </html>
  );
}
