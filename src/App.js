import React, { Component } from 'react'
import request from 'request-promise-native'
import Autocomplete from 'react-autocomplete'
import Settings from './settings.json'
import './App.css'

// Only log info to the console if we're not running a test
const consoleLog = process.env.NODE_ENV !== 'test'

class App extends Component {
  // Default state
  blankState = {
    error: null,
    lat: null,
    lng: null,
    loading: false,
    locations: [],
    request: null,
    value: '',
    weather: null
  }

  // setState that returns a promise
  promiseSetState = async state => new Promise(resolve => this.setState(state, resolve))

  constructor (props) {
    super(props)
    if (consoleLog) console.log('%c Welcome to Reather! :) ', 'background:#ffc966;border:5px solid #ffa500;border-radius:10px;padding:5px;')

    let value = ''

    // Get initial value via URL path
    // if (window.location.pathname !== '/') {
    //   value = decodeURIComponent(window.location.pathname.substring(1))
    //   if (consoleLog) console.log('Value set via pathname:', value)
    // }

    this.state = Object.assign({}, this.blankState, { value })
    this.clearState = this.clearState.bind(this)
    this.getLocations = this.getLocations.bind(this)
    this.getWeather = this.getWeather.bind(this)
  }

  // Clears the state
  clearState () {
    this.setState(Object.assign({}, this.blankState), () => console.log('Cleared state'))
  }

  componentDidMount (props) {
    let self = this

    if (this.state.value) {
      // Automatically get weather for value set via URL path
      this.getWeather()
    } else if (navigator.geolocation) {
      // If no URL path was passed then attempt to populate value with current position
      if (consoleLog) console.log('Getting current location...')

      navigator.geolocation.getCurrentPosition(pos => {
        if (consoleLog) console.log('Current location:', pos)

        // Only set the value if the user hasn't started typing yet
        if (!self.state.value) {
          self.setState({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            value: `${pos.coords.latitude},${pos.coords.longitude}`
          })
        }
      }, error => { if (consoleLog) console.log('An error occured while trying to get current location:', error) })
    } else {
      if (consoleLog) console.log('Browser does not support geolocation')
    }

    // Detect if user hits the back or forward buttons
    // window.addEventListener('popstate', e => {
    //   if (consoleLog) console.log('Window popstate:', window.location.pathname)
    //
    //   if (window.location.pathname === '/') {
    //     // Reset state if going back to root
    //     self.clearState()
    //   } else {
    //     // Otherwise set the value and get the weather
    //     let value = decodeURIComponent(window.location.pathname.substring(1))
    //     self.setState({ value }, () => self.getWeather())
    //   }
    // })
  }

  // Converts directions from degress to compass
  degToCompass (num) {
    let val = Math.floor((num / 22.5) + 0.5)
    let dir = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    return dir[(val % 16)]
  }

  // Queries geonames.org API for location field auto complete
  getLocations (value) {
    if (!value) return
    if (this.state.request) this.state.request.abort() // Abort last active request

    let url = `https://secure.geonames.org/searchJSON?username=${Settings.geonamesUser}&maxRows=1000&country=${Settings.country}&`
    let self = this

    // Decide which query parameter to use depending on if value is a zip code or not
    if (isNaN(value)) {
      url += `name_startsWith=${value}`
    } else {
      url += `postalcode_startsWith=${value}`
    }

    if (consoleLog) console.log(`Fetching locations that match "${value}"...`)

    let req = request(url, function (error, response, body) {
      if (consoleLog) console.log('geonames.org response:', response.toJSON())

      if (error) return self.promiseSetState({ locations:[] }) // Just ignore errors

      let data = JSON.parse(body)
      if (consoleLog) console.log('geonames.org parsed body:', data)

      let locations = data.geonames
        .filter(l => l.fcl === 'P') // Only return cities
        .map(l => Object({
          id: l.geonameId,
          label: `${l.name}, ${l.adminName1}`,
          lat: l.lat,
          lng: l.lng
        }))

      return self.promiseSetState({ locations })
    })

    return self.promiseSetState({ request:req }).then(() => req)
  }

  // Queries openweathermap.org API for weather data
  getWeather () {
    if (!this.state.value) return
    this.setState({ loading:true, error:null })

    let url = `https://api.openweathermap.org/data/2.5/weather?appid=${Settings.openmapKey}&units=${Settings.units}&`
    let self = this

    // Change the URL to reflect our search
    // let path = '/' + this.state.value
    // if (decodeURIComponent(window.location.pathname) !== path) {
    //   window.history.pushState(null, null, path)
    // }

    // Use regex to check if search value is coordinates
    let reg = new RegExp(/(^[-+]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?)),\s*([-+]?(?:180(?:\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?))$/)
    let lat = this.state.lat
    let lng = this.state.lng

    if (reg.test(this.state.value)) {
      let coords = this.state.value.split(',')
      lat = coords[0]
      lng = coords[1]
      this.setState({ lat, lng })
    }

    // Decide which query parameter to use depending on if we're looking for weather via city name, zip code, or coordinates
    if (lat && lng) {
      url += `lat=${lat}&lon=${lng}`
    } else if (isNaN(this.state.value)) {
      url += `q=${this.state.value},${Settings.country}`
    } else {
      url += `zip=${this.state.value},${Settings.country}`
    }

    if (consoleLog) console.log('Fetching weather...', url)

    return request(url, function (error, response, body) {
      if (error) return self.promiseSetState({ error:error.message, loading:false, weather:null })

      if (consoleLog) console.log('openweathermap.org response:', response.toJSON())

      self.setState({ loading:false })

      let weather = JSON.parse(body)
      if (consoleLog) console.log('openweathermap.org parsed body:', weather)

      if (response.statusCode !== 200 && weather.message) {
        return self.promiseSetState({ error:weather.message, weather:null })
      }

      return self.promiseSetState({ weather })
    }).catch(e => {}) // We'll handle errors in the callback
  }

  render () {
    let template

    if (!this.state.weather) {
      // Landing template
      template = (
        <div className="landing">
          <p>Hi! Welcome to Reather. Enter a { Settings.country } city, zip code, or coordinates below to get the current weather:</p>

          <form onSubmit={ e => { e.preventDefault(); this.getWeather(); } }>
            <Autocomplete
              items={ this.state.locations }
              shouldItemRender={ (item, value) => item.label.toLowerCase().indexOf(value.toLowerCase()) > -1 }
              getItemValue={ item => item.label }
              menuStyle={ {
                backgroundColor: '#ffa500',
                border: '2px solid #383838',
                borderRadius: '5px',
                padding: '5px',
                position: 'absolute',
                left: '20px',
                top: '75%',
                maxHeight: '200px',
                overflowY: 'scroll'
              } }
              renderItem={ (item, highlighted) =>
                <div
                  key={ item.id }
                  style={ { backgroundColor: highlighted ? '#ffc966' : 'transparent' } }>
                  { item.label }
                </div>
              }
              inputProps={ { id:'location-value', disabled:this.state.loading } }
              value={ this.state.value }
              onChange={ (e, value) => {
                this.setState({ value, lat:null, lng:null })
                this.getLocations(value)
              } }
              onSelect={ (value, item) => {
                this.setState({ value, lat:item.lat, lng:item.lng })
              } }
            />

            <input type="submit" value="Go!" disabled={ this.state.loading } />
          </form>

          { this.state.error && <p id="error" className="error">{ this.state.error }</p> }
        </div>
      )
    } else {
      // Results template
      let weather = this.state.weather
      let weatherIconType
      let weatherTime = 'night'
      let weatherId = weather.weather[0].id
      let dt = weather.dt
      let sunrise = weather.sys.sunrise
      let sunset = weather.sys.sunrise

      if (dt >= sunrise && dt <= sunset) weatherTime = 'day'

      if (weatherId >= 200) weatherIconType = 'thunderstorm'
      if (weatherId >= 300) weatherIconType = 'showers'
      if (weatherId >= 500) weatherIconType = 'rain'
      if (weatherId >= 600) weatherIconType = 'snow'
      if (weatherId >= 700) weatherIconType = 'fog'
      if (weatherId > 800) weatherIconType = 'cloudy'
      if (weatherId === 800 && weatherTime === 'day') weatherIconType = 'sunny'
      if (weatherId === 800 && weatherTime === 'night') weatherIconType = 'clear'

      template = (
        <div className="results">
          <h2>
            <i className={ `wi wi-${weatherTime}-${weatherIconType}` }></i> { weather.main.temp.toFixed(1) }&deg;
            <br />{ weather.name }
          </h2>
          <p>{ weather.weather[0].description }</p>

          <ul>
            { weather.main.temp_max && <li>High: { weather.main.temp_max }&deg;</li> }
            { weather.main.temp_min && <li>Low: { weather.main.temp_min }&deg;</li> }
            { weather.wind.speed && <li>Wind Speed: { weather.wind.speed } { Settings.units === 'imperial' ? 'mph' : 'mps' }</li> }
            { weather.wind.deg && <li>Wind Direction: { this.degToCompass(weather.wind.deg) }</li> }
            { weather.main.humidity && <li>Humidity: { weather.main.humidity }%</li> }
            { weather.main.pressure && <li>Pressure: { weather.main.pressure } hPa</li> }
          </ul>

          <input
            type="button"
            value="Try another location"
            onClick={ () => {
              this.clearState()
              // window.history.pushState(null, null, '/')
            } } />
        </div>
      )
    }

    return (
      <div className="app">
        <a href="/">
          <h1><i className={ 'wi wi-day-sunny ' + (this.state.loading ? 'spin' : '') }></i> Reather</h1>
        </a>
        <div className="modal">{ template }</div>
        <div className="footer">
          <div>Data courtesy of <a href="http://www.geonames.org/" target="_new">geonames</a> and <a href="https://openweathermap.org/" target="_new">openweathermap</a></div>
          <div>&copy; 2018 <a href="http://kodieg.com/">Kodie Grantham</a></div>
        </div>
      </div>
    )
  }
}

export default App
