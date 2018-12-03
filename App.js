import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ListView,
  Button,
  Dimensions,
  StatusBar,
  Alert
} from 'react-native';
const { width, height } = Dimensions.get('window')
import io from 'socket.io-client';
import _ from 'lodash'
const socket = io.connect('http://localhost:3000', { transports: ['websocket'] });

let _this
let username
let busy = false
let incallwith = ""

function onLogin(data) {
  if (data.success === false) {
    _this.setState({ message: "oops...try a different username" })
  } else {
    //var loginContainer = document.getElementById('loginContainer');
    //loginContainer.parentElement.removeChild(loginContainer);
    username = data.username;
    console.log("Login Successfull");
    console.log("logged in as :" + username);
    console.log(data.userlist);
    let toArray = _.keys(data.userlist);
    const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
    _this.setState({ currScreen: 'userList', dataSource: ds.cloneWithRows(toArray) })
  }
}
function callAccept(data) {
  console.log("call accepted");
  // code
  socket.send({
    type: "callAccepted",
    callername: data.callername,
    from: username
  })
}
function callReject(data) {
  console.log("call rejected");
  socket.send({
    type: "callRejected",
    callername: data.callername,
    from: username
  })
  busy = false
  incallwith = ""
}
function onAnswer(data) {
  if (busy == false) {
    busy = true
    incallwith = data.callername
    //var res = confirm(data.callername+" is calling you");
    Alert.alert(
      'Incoming Call',
      data.callername + " is calling you",
      [
        { text: 'Cancel', onPress: () => callReject(data), style: 'cancel' },
        { text: 'OK', onPress: () => callAccept(data) },
      ],
      { cancelable: false }
    )

  } else {
    console.log("call busy");
    //this.setState({ callResponse: "Call accepted by :"+ data.responsefrom })
    socket.send({
      type: "callBusy",
      callername: data.callername,
      from: username
    })

  }
}
function onResponse(data) {
  switch (data.response) {
    case "accepted":
      incallwith = data.responsefrom;
      _this.setState({ callResponse: "Call accepted by " + data.responsefrom })
      // code
      break;
    case "rejected":
      _this.setState({ callResponse: "Call rejected by " + data.responsefrom })
      busy = false;
      incallwith = ""
      break;
    case "busy":
      _this.setState({ callResponse: data.responsefrom + " call busy" })
      busy = false;
      incallwith = ""
      break;
    default:
      _this.setState({ callResponse: data.responsefrom + " is offline" })
      busy = false;
      incallwith = ""
  }

}
socket.on('roommessage', function (message) {
  var data = message;
  let currUsers
  const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
  switch (data.type) {
    case "login":
      currUsers = _this.state.dataSource._dataBlob["s1"];
      currUsers.push(data.username);
      _this.setState({ dataSource: ds.cloneWithRows(currUsers) })
      console.log("New user : " + data.username);
      break;
    case "disconnect":
      currUsers = _this.state.dataSource._dataBlob["s1"];
      currUsers = _.pull(currUsers, data.username);
      _this.setState({ dataSource: ds.cloneWithRows(currUsers) })
      console.log("User disconnected : " + data.username);
      break;
    default:
      break;
  }
})
socket.on('message', function (message) {
  var data = message;
  _this.setState({ callResponse: "" })
  switch (data.type) {
    case "login":
      onLogin(data);
      break;
    case "answer":
      console.log("getting called");
      onAnswer(data);
      break;
    case "callResponse":
      onResponse(data);
      break;
    default:
      break;
  }
})

export default class VideoCallingApp extends Component {
  constructor(props) {
    super(props);
    const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
    this.state = {
      currScreen: 'login',
      text: 'userA',
      message: '',
      callResponse: '',
      dataSource: ds.cloneWithRows([]),
    }
    // the user of which curren video screen has been rendered
    this.currUser = "";
  }
  componentDidMount() {
    _this = this;


  }
  onPressLogin() {
    let username = this.state.text
    if (username == "") {
      this.setState({ message: "Please enter Username" })
    } else {
      socket.send({
        type: "login",
        name: username
      })
    }
  }
  renderRow(data) {
    //let usernameRow = Object.keys(data)[0]
    //console.log("data");
    //console.log(data);
    return (<View style={styles.rowContainer}>
      <TouchableOpacity onPress={() => this.startVideo(data)}><Text style={styles.text} >{data}</Text></TouchableOpacity>
    </View>)

  }
  backtouserList() {
    this.currUser = "";
    this.setState({ currScreen: 'userList', callResponse: '' })
  }
  startVideo(data) {
    //console.warn("Video "+data );
    this.currUser = data;
    this.setState({ currScreen: 'startVideo' })
  }
  callUser() {
    busy = true;
    incallwith = this.currUser
    socket.send({
      type: "callUser",
      name: incallwith,
      callername: username
    })
  }
  renderVideo() {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => this.backtouserList()}><Text style={styles.toolbarButton}>Back</Text></TouchableOpacity>
          <Text style={styles.toolbarTitle}>{this.currUser}</Text>
          <Text style={styles.toolbarButton}></Text>
        </View>
        <View style={styles.container}>
          <Button
            onPress={() => this.callUser()}
            title="Call"
            color="#81c04d"
          />
          <Text style={[styles.instructions, { color: 'grey' }]}>{this.state.callResponse}</Text>

        </View>
      </View>
    )
  }
  renderLogin() {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.toolbar}>
          <Text style={styles.toolbarButton}></Text>
          <Text style={styles.toolbarTitle}></Text>
          <Text style={styles.toolbarButton}></Text>
        </View>
        <View style={styles.container}>
          <Text style={styles.instructions}>
            Enter User Name :
          </Text>
          <TextInput
            style={{ padding: 5, alignSelf: "center", height: 40, width: width * 80 / 100, borderColor: 'gray', borderWidth: 1 }}
            onChangeText={(text) => this.setState({ text })}
            value={this.state.text}
          />
          <Button
            onPress={() => this.onPressLogin()}
            title="Login"
            color="#81c04d"
          />
          <Text style={styles.instructions}>{this.state.message}</Text>

        </View>
      </View>
    )
  }
  renderList() {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.toolbar}>
          <Text style={styles.toolbarButton}></Text>
          <Text style={styles.toolbarTitle}></Text>
          <Text style={styles.toolbarButton}></Text>
        </View>

        <ListView
          //style={{marginTop: 10}}
          enableEmptySections={true}
          dataSource={this.state.dataSource}
          renderRow={(rowData) => this.renderRow(rowData)}
        />
      </View>)
  }
  render() {
    switch (this.state.currScreen) {
      case 'login':
        return this.renderLogin();
        break;
      case 'userList':
        return this.renderList();
        break;
      case 'startVideo':
        return this.renderVideo();
        break;
      default:

    }
    return this.renderLogin();
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  rowContainer: {
    flex: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    marginLeft: 12,
    fontSize: 16,
  },
  toolbar: {
    backgroundColor: '#81c04d',
    paddingTop: 30,
    paddingBottom: 10,
    flexDirection: 'row'
  },
  toolbarButton: {
    width: 55,
    color: '#fff',
    textAlign: 'center'
  },
  toolbarTitle: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    flex: 1
  }
});



// import React, { Component } from 'react';
// import { Platform, StyleSheet, Text, View } from 'react-native';

// const instructions = Platform.select({
//   ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
//   android:
//     'Double tap R on your keyboard to reload,\n' +
//     'Shake or press menu button for dev menu',
// });

// type Props = {};
// export default class App extends Component<Props> {
//   render() {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.welcome}>Welcome to React Native!</Text>
//         <Text style={styles.instructions}>To get started, edit App.js</Text>
//         <Text style={styles.instructions}>{instructions}</Text>
//       </View>
//     );
//   }
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F5FCFF',
//   },
//   welcome: {
//     fontSize: 20,
//     textAlign: 'center',
//     margin: 10,
//   },
//   instructions: {
//     textAlign: 'center',
//     color: '#333333',
//     marginBottom: 5,
//   },
// });
