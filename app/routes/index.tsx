import { Link } from 'remix';
import type { LinksFunction } from 'remix';
import landingStyles from '~/styles/landing.css';

export const links: LinksFunction = () => [
  {
    rel: 'stylesheet',
    href: landingStyles,
  },
];

export default function Landing() {
  return (
    <div className="wrapper">
      <header>
        <div className="header">
          <Link className="home" to="/">
            <img className="svg-logo" alt="synthesizer shaped logo that links to home page" src="/images/midi.svg" />
          </Link>
          <div className="links">
            <a href="https://github.com/ashmortar" target="_blank">
              <img
                className="svg-logo"
                alt="github logo that links to https://github/com/ashmortar"
                src="/images/github.svg"
              />
            </a>
            <a href="https://www.linkedin.com/in/aaronrosspdx/" target="_blank">
              <img
                className="svg-logo"
                alt="linkedin logo that links to https://linkedin.com/in/aaronrosspdx"
                src="/images/linkedin.svg"
              />
            </a>
          </div>
        </div>
      </header>
      <main>
        <div className="content">
          <h1>ashmortar.dev</h1>
          <p>Welcome to my experiments.</p>
          <ul>
            <li>
              <Link to="trivia">Live Trivia App</Link>
            </li>
          </ul>
        </div>
      </main>
      <footer>
        <small> &copy; 2022 Aaron Ross</small>
      </footer>
    </div>
  );
}
