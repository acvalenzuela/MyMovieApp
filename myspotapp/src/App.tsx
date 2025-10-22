import React from 'react';
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import SignUp from './pages/SignUp';

/* Ionic CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/" component={Login} />
          <Route exact path="/home" component={Home} />
          <Route exact path="/signup" component={SignUp} />
          <Redirect to="/" />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
