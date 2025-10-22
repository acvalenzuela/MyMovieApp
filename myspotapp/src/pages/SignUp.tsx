import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText
} from '@ionic/react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import './SignUp.css';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    setError('');
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("✅ Registration successful! You can now log in.");
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding centered-content">
        <div className="signup-container">
          <h2>Sign Up</h2>
          {error && <IonText color="danger">{error}</IonText>}

          <IonItem>
            <IonLabel position="floating">Email</IonLabel>
            <IonInput value={email} onIonChange={e => setEmail(e.detail.value ?? '')} />
          </IonItem>

          <IonItem>
            <IonLabel position="floating">Password</IonLabel>
            <IonInput type="password" value={password} onIonChange={e => setPassword(e.detail.value ?? '')} />
          </IonItem>

          <IonItem>
            <IonLabel position="floating">Confirm Password</IonLabel>
            <IonInput type="password" value={confirmPassword} onIonChange={e => setConfirmPassword(e.detail.value ?? '')} />
          </IonItem>

          <IonButton expand="block" onClick={handleSignUp}>Sign Up</IonButton>

          <IonText
            color="primary"
            className="ion-text-link"
            onClick={() => window.location.href='/'}
          >
            Already have an account? Log In
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SignUp;
