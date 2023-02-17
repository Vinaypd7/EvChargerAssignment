import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, Linking, Platform, Alert, FlatList, TouchableOpacity } from "react-native";
import MapView from "react-native-maps";
import Geolocation from 'react-native-geolocation-service';
import { Marker } from "react-native-maps";
import { PERMISSIONS, RESULTS, checkMultiple, requestMultiple } from 'react-native-permissions';
import { captureScreen } from "react-native-view-shot";
import axios from 'axios';
import { chargers } from './dynamicData.json';

export default function App() {
  const mapRef = useRef(null);
  useEffect(() => {
    requestLocation()
  }, [])

  const openAlert = () => {
    Alert.alert(
      "Permission Required",
      "Location permission should be enabled to access your current postion",
      [
        {
          text: "OK",
          onPress: () => GoSettings()
        }
      ],
      {
        cancelable: false
      }
    );
    return true;
  };
  const GoSettings = async () => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    }
    if (Platform.OS === 'android') {
      await Linking.openSettings();
    }
  };

  const requestLocation = async () => {
    if (Platform.OS === 'android') {
      const res = await checkMultiple([PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]);
      if (res[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] == RESULTS.BLOCKED) {
        openAlert()
      }
      else if (res[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === RESULTS.GRANTED) {
        getCurrentLocation();
      }
      else if (res[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === RESULTS.DENIED) {
        const res2 = await requestMultiple([PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]);
        if (res2[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === RESULTS.GRANTED) {
          getCurrentLocation();
        } else if (res2[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === RESULTS.BLOCKED) {
          openAlert()
        }
      }
    }
    if (Platform.OS === 'ios') {
      const res = await checkMultiple([PERMISSIONS.IOS.LOCATION_WHEN_IN_USE]);
      if (res[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] == RESULTS.BLOCKED) {
        openAlert()
      }
      else if (res[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.GRANTED) {
        getCurrentLocation();
      } else if (res[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.LIMITED) {
        requestMultiple([PERMISSIONS.IOS.LOCATION_WHEN_IN_USE]).then((res2) => {
          if (res2[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.GRANTED) {
            getCurrentLocation();
          } else if (res2[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.BLOCKED || res2[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.LIMITED) {
            openAlert()
          }
        })
      }
      else if (res[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.DENIED) {
        const res2 = await requestMultiple([PERMISSIONS.IOS.LOCATION_WHEN_IN_USE]);
        if (res2[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.GRANTED) {
          selectFile();
        } else if (res2[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.BLOCKED || res2[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.LIMITED) {
          openAlert()
        }
      }
    }
  };

  const [region, setRegion] = useState({
    latitude: 51.5079145,
    longitude: -0.0899163,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        if (position?.coords?.latitude && position?.coords?.longitude) {
          let myloaction = {
            latitude: position?.coords?.latitude,
            longitude: position?.coords?.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }
          setRegion(myloaction);
          mapRef.current.animateToRegion(myloaction, 2 * 1000);
        }
      },
      (error) => {
        console.log('errr ', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 20000
      }
    );
  };

  const captureAndShareScreenshot = (item) => {
    let myloaction = {
      latitude: parseFloat(item?.latitude),
      longitude: parseFloat(item?.longitude),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
    setRegion(myloaction);
    mapRef.current.animateToRegion(myloaction, 2 * 1000);
    captureScreen({
      format: "webm",
      quality: 0.8,
    }).then(
      (uri) => apicall({ "file": uri }),
      (error) => console.error("Oops, snapshot failed", error)
    );
  };

  const apicall = async (data) => {
    axios
      .post("HTTP://3.7.20.173:8503/api/upload/", data)
      .then((response) => console.log(response))
      .catch((err) => console.log(err));
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={(region) => setRegion(region)}
      >
        <Marker
          coordinate={region}
          pinColor="pink"
        />
        {chargers?.map((u, i) => {
          const loct = {
            latitude: parseFloat(u.latitude),
            longitude: parseFloat(u.longitude)
          }
          return (
            <Marker
              key={i}
              coordinate={loct}
              pinColor="blue"
            />
          )
        })}

      </MapView>
      <FlatList
        data={chargers}
        horizontal={true}
        renderItem={({ item, index }) => {
          let dist = (item.distance / 1000).toFixed(1)

          return (
            <TouchableOpacity style={{
              height: 250,
              width: 200,
              borderRadius: 10,
              backgroundColor: 'black',
              marginHorizontal: 5,
              marginTop: 450,
              padding: 10
            }} key={index}
              onPress={() => captureAndShareScreenshot(item)}>
              <Text numberOfLines={1} style={{ fontSize: 16 }}>{item.name}</Text>
              <View style={{ flexDirection: 'row', marginTop: 5 }}>
                <Text style={{ fontSize: 12 }}>{item.address}</Text>
                <Text style={{ fontSize: 12 }}>{'  ' + dist + ' Km'}</Text>
              </View>
              <Text style={{ fontSize: 13, marginVertical: 10 }}>Supported Connectors</Text>
              {item?.connector_types?.map((u, i) => {
                const slipted = u.split('-')
                return (
                  <View key={i} style={{ flexDirection: 'row', marginBottom: 5, justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 12 }}>{slipted[0]}</Text>
                      <Text style={{ fontSize: 12 }}>15KW Fast Charging</Text>
                    </View>
                    <Text style={{ fontSize: 12 }}>{'X' + slipted[1]}</Text>
                  </View>
                )
              })}
            </TouchableOpacity>
          )
        }}
      />
    </View>

  );
}
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  text: {
    fontSize: 20,
    backgroundColor: "lightblue",
  },
});
