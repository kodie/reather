# Reather
[![Travis build status](https://img.shields.io/travis/kodie/reather.svg?style=flat-square)](https://travis-ci.org/kodie/reather) [![license](https://img.shields.io/github/license/kodie/reather.svg?style=flat-square)](LICENSE.md)

A React Weather App Exercise

## Installation

```
$ git clone https://github.com/kodie/reather.git
$ cd reather
$ npm install
```

## Development

```
$ npm start
```

The app will start in development mode available at http://localhost:3000 and will automatically refresh if you make any edits.

## Test

```
$ npm test
```

All API calls are mocked so that tests can be ran offline.

## Build

```
$ npm run build
```

An optimized production version of the app will be built in the `/build` folder. [react-snapshot](https://github.com/geelen/react-snapshot) is used to pre-render the app.

## Deployment

The app is automatically tested and then built and pushed to the [gh-pages](https://github.com/kodie/reather/tree/gh-pages) branch (which is served via [GitHub Pages](https://pages.github.com) and available at https://kodie.github.io/reather) via [Travis CI](https://travis-ci.org) whenever a commit is pushed to master.

Optionally you can build and deploy manually by running:

```
$ npm run deploy
```

## License
MIT. See the [LICENSE file](LICENSE.md) for more info.
