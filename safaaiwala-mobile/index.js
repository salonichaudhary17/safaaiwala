import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It ensures that whether you load the app in Expo Go, a native build, or web,
// the environment is set up appropriately.
registerRootComponent(App);
