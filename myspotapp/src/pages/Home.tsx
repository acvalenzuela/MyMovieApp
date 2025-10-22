import React from 'react';
import { IonPage, IonContent, IonButton } from '@ionic/react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const Home: React.FC = () => {
  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <h2>Welcome!</h2>
        <IonButton onClick={handleLogout}>Logout</IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Home;
