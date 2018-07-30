import React from 'react'
import Enzyme, { configure, mount } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import App from './App'
import Settings from './settings.json'

Enzyme.configure({ adapter:new Adapter() })

const nock = require('nock')

const geonamesMockData = {
  geonames: [
    { adminName1:'Iowa', fcl:'P', geonameId:4853828, lat:'41.60054', lng:'-93.60911', name:'Des Moines' },
    { adminName1:'Washington', fcl:'P', geonameId:5792244, lat:'47.40177', lng:'-122.32429', name:'Des Moines' }
  ]
}

const geonames = nock('http://ws.geonames.org').persist()
  .get('/searchJSON')
  .query(true)
  .reply(200, geonamesMockData)

const openweathermapMockData = {
  coords: { lon:-93.6, lat:41.59 },
  dt: 1532892900,
  main: { humidity:57, pressure:1019, temp:77.61, temp_max:80.6, temp_min:75.2 },
  name: 'Des Moines',
  sys: { sunrise:1532862410, sunset:1532914454 },
  visibility: 16093,
  weather: [{ description:'few clouds', id:801 }],
  wind: { speed:5.82 }
}

const openweathermapMockDataNotFound = { cod:'404', message:'city not found' }

const openweathermap = nock('http://api.openweathermap.org').persist()
  .get('/data/2.5/weather')
    .query(query => {
      if (query.zip) return true
    })
    .reply(200, openweathermapMockData)
  .get('/data/2.5/weather')
    .query(query => {
      if (query.q === 'INVALID_LOCATION,' + Settings.country) return true
    })
    .reply(404, openweathermapMockDataNotFound)

it('should populate state.locations with locations when getLocations is called', async () => {
  let component = mount(<App />)
  await component.instance().getLocations('Des')
  expect(component.state('locations').length).toEqual(2)
})

it('should display autocomplete when user starts typing', async () => {
  let component = mount(<App />)
  await component.instance().getLocations('Des')
  let input = component.find('#location-value').first()
  input.simulate('change', { target:{ value:'Des' } }).simulate('focus')
  let autocomplete = component.find('#location-value + div').first()
  expect(autocomplete.children().length).toEqual(2)
})

it('should populate state.weather with weather data when getWeather is called', async () => {
  let component = mount(<App />)
  component.setState({ value:'50317' })
  await component.instance().getWeather()
  expect(component.state('weather').dt).toBeGreaterThan(0)
})

it('should display an error message if an invalid city was entered', async () => {
  let component = mount(<App />)
  component.setState({ value:'INVALID_LOCATION' })
  await component.instance().getWeather()
  component.update()
  let errorMsg = component.find('#error').first()
  expect(errorMsg.text()).toEqual('city not found')
})
