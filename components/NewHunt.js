import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ListView,
  Alert,
  Button,
  AsyncStorage,
  Clipboard,
  AlertIOS
} from 'react-native';
import { StackNavigator } from 'react-navigation';
import { Location, Permissions, MapView } from 'expo';
import axios from 'axios';
const url = "https://damp-falls-88401.herokuapp.com/";
const mapUrl = "https://maps.googleapis.com/maps/api/geocode/json";
const key = "AIzaSyAXf9lLD5B3xgJKK3zhUfDSy9cbDDohO4M";

class NewHunt extends React.Component {
  static navigationOptions = (props) => ({
    title: 'New Hunt',
  })

  constructor() {
    super();
    const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = {
      lat: 0,
      long: 0,
      gameID: '',
      locationName: '',
      locationHint: '',
      locationClue: '',
      locationsMap: [],
      disabled: false,
      locations: ds.cloneWithRows([]),
    }
    AsyncStorage.getItem('game')
      .then(result => {
        var parsedResult = JSON.parse(result);
        this.setState({gameID: parsedResult.gameID});
        axios.post(url + 'getLocations', {
          gameID: this.state.gameID
        })
        .then(response => {
          if (! response.data.retrieved) {
            alert("Failed to get game state");
          } else {
            if (response.data.locations) {
              this.setState({
                locations: ds.cloneWithRows(response.data.locations),
                locationsMap: response.data.locations,
                // players: ds.cloneWithRows(response.data.players)
              });
            }
          }
        })
        .catch(err => {
          alert('Error loading data.');
        });
      })
  }

  componentDidMount() {
    navigator.geolocation.getCurrentPosition(
      (success) => {
        this.setState({
          lat: success.coords.latitude,
          long: success.coords.longitude
        })
      },
      (error) => {
        alert("Error! Can\'t get current location.")
      }
    )
  }

  add() {
    if (! this.state.locationName || ! this.state.locationHint || ! this.state.locationClue) {
      alert('Empty fields.');
      return;
    }
    var addressJoinedByPlus = this.state.locationName.split(' ').join('+');
    axios.post(mapUrl+'?address=' + addressJoinedByPlus + '&key=' + key)
      .then(response => {
        var responseLocation = response.data.results[0].geometry.location;
        this.setState({lat: responseLocation.lat, long: responseLocation.lng});
        axios.post(url + 'addLocation', {
          gameID: this.state.gameID,
          locationName: this.state.locationName,
          locationHint: this.state.locationHint,
          locationClue: this.state.locationClue,
          lat: this.state.lat,
          long: this.state.long,
        })
        .then(response => {
          if (! response.data.added) {
            alert("Failed to add location.");
          } else {
            const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
            var updateLocationsMap = this.state.locationsMap.slice();
            updateLocationsMap = response.data.locations;
            this.setState({
              locations: ds.cloneWithRows(response.data.locations),
              locationsMap: updateLocationsMap,
              locationName: '',
              locationHint: '',
              locationClue: '',
            });
          }
        })
        .catch(err => {
          alert("Error adding location to database.");
        })
      })
      .catch(err => {
        alert("Error retrieving data from Google Map.");
      })
  }

  shareHunt() {
    Alert.alert(
      'Your sharable game ID is: ',
      this.state.gameID,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Awesome! Copy ID', onPress: () => Clipboard.setString(this.state.gameID)},
      ]
    );
  }

  deleteLocation(rowData) {
    Alert.alert(
      'Delete location',
      'Are you sure you want to delete location?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', onPress: () => this.deleteLocationClickHandler(rowData), style: 'destructive'},
      ]
    );
  }

  deleteLocationClickHandler(rowData) {
    axios.post(url + 'deleteLocation', {
      gameID: this.state.gameID,
      lat: rowData.lat,
      long: rowData.long,
    })
    .then(response => {
      if (! response.data.deleted) {
        alert("Cannot delete location.");
      } else {
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        var updateLocationsMap = this.state.locationsMap.slice();
        updateLocationsMap = response.data.locations;
        this.setState({
          locations: ds.cloneWithRows(response.data.locations),
          locationsMap: updateLocationsMap,
        });
      }
    })
  }

  deleteHunt() {
    AlertIOS.alert(
    'Delete hunt',
    'Are you sure you want to delete hunt?',
     [
       {text: 'Cancel', style: 'cancel'},
       {text: 'Delete', onPress: () => this.deleteHuntClickHandle(), style: 'destructive'},
     ],
    );
  }

  deleteHuntClickHandle() {
    AsyncStorage.getItem('game')
      .then(result => {
        var parsedResult = JSON.parse(result);
        return parsedResult;
      })
      .then(parsedResult => {
        axios.post(url + 'deleteHunt', {
          gameID: parsedResult.gameID,
          creatorID: parsedResult.creatorID
        })
        .then(response => {
          if (! response.data.deleted) {
            alert('Failed to delete game in backend.');
          } else {
            AsyncStorage.removeItem('game');
            this.props.navigation.goBack();
          }
        })
      })
      .catch(err => {
        alert("Failed to delete game.");
      })
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.mapBox}>
          <MapView
            style={{height: '100%', width: '100%'}}
            showsUserLocation={true}
            region={{
              latitude: this.state.lat,
              longitude: this.state.long,
              latitudeDelta: 0.01,
              longitudeDelta: 0.005
            }}>
            {this.state.locationsMap.map((eachLocation, index) => (<MapView.Marker
              key={index + 1}
              coordinate={{latitude: eachLocation.lat, longitude: eachLocation.long}}
              title={eachLocation.name}
            />))}
          </MapView>
        </View>
        <View style={styles.inputAddBox}>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter specific name of location"
              value={this.state.locationName}
              onChangeText={text => this.setState({locationName: text})}
            />
            <TextInput
              style={[styles.textInput, {marginTop: 5}]}
              placeholder="Enter hint to find location"
              value={this.state.locationHint}
              onChangeText={text => this.setState({locationHint: text})}
            />
            <TextInput
              style={[styles.textInput, {marginTop: 5}]}
              placeholder="Enter clue to be revealed"
              value={this.state.locationClue}
              onChangeText={text => this.setState({locationClue: text})}
            />
          </View>
          <View style={styles.addButtonBox}>
            <TouchableOpacity style={styles.addButton} disabled={this.state.disabled} onPress={() => this.add()}>
              <Text style={styles.addButtonLabel}>ADD</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.listBox}>
          <ListView
            dataSource={this.state.locations}
            enableEmptySections={true}
            renderRow={(rowData) => (
              <View>
                <TouchableOpacity onLongPress={this.deleteLocation.bind(this, rowData)}>
                  <Text style={{marginLeft: 10, fontFamily: 'Arial', fontWeight: 'bold', fontSize: 18}}>{rowData.name}</Text>
                </TouchableOpacity>
                <Text style={{marginLeft: 20, fontFamily: 'Arial', fontSize: 15}}>Hint: {rowData.hint}</Text>
                <Text style={{marginLeft: 20, marginBottom: 15, fontFamily: 'Arial', fontSize: 15}}>Clue: {rowData.clue}</Text>
              </View>
            )}
          />
        </View>
        <View style={styles.deleteBox}>
          <View style={styles.deleteShareContainer}>
            <TouchableOpacity onPress={() => this.shareHunt()}>
              <Text style={styles.shareText}>SHARE HUNT</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.deleteShareContainer}>
            <TouchableOpacity onPress={() => this.deleteHunt()}>
              <Text style={styles.deleteText}>DELETE HUNT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0ffa9',
    flexDirection: 'column',
  },
  inputAddBox: {
    display: 'flex',
    flexDirection: 'row',
    margin: 0,
    padding: 0,
    height: '23%',
    width: '100%',
    alignItems: 'center'
  },
  inputBox: {
    margin: 0,
    padding: 0,
    width: '80%'
  },
  addButtonBox: {
    width: '20%',
    height: '100%',
    paddingLeft: 5,
    paddingTop: 12,
    paddingBottom: 12
  },
  mapBox: {
    height: '35%',
  },
  listBox: {
    height: '37%'
  },
  textInput: {
    paddingLeft: 10,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: 'gray',
    height: 35
  },
  addButton: {
    backgroundColor: '#3dbd00',
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    borderRadius: 5
  },
  addButtonLabel: {
    color: 'white',
    textAlign: 'center',
    fontFamily: 'Arial',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteBox: {
    flexDirection: 'row',
    height: '5%',
  },
  shareText: {
    color: '#3dbd00',
    fontWeight: 'bold',
    fontSize: 15,
  },
  deleteText: {
    color: '#ff4d50',
    fontWeight: 'bold',
    fontSize: 15,
  },
  deleteShareContainer: {
    height: '100%',
    width: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5
  }
})

export default NewHunt;
