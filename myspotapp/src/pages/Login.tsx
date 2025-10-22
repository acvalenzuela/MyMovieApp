import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonCheckbox,
  IonText
} from '@ionic/react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('email');
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (rememberMe) localStorage.setItem('email', email);
      else localStorage.removeItem('email');
      window.location.href = '/home';
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email first");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding centered-content">
        <div className="login-container">
          <h2>Login</h2>
          {error && <IonText color="danger">{error}</IonText>}

          <IonItem>
            <IonLabel position="floating">Email</IonLabel>
            <IonInput value={email} onIonChange={e => setEmail(e.detail.value ?? '')} />
          </IonItem>

          <IonItem>
            <IonLabel position="floating">Password</IonLabel>
            <IonInput type="password" value={password} onIonChange={e => setPassword(e.detail.value ?? '')} />
          </IonItem>

          <div className="checkbox-container">
            <IonCheckbox
              checked={rememberMe}
              onIonChange={e => setRememberMe(e.detail.checked)}
            />
            <IonLabel>Remember Me</IonLabel>
          </div>

          <IonButton expand="block" onClick={handleLogin}>Login</IonButton>
          <IonButton fill="clear" expand="block" onClick={handleForgotPassword}>Forgot Password?</IonButton>

          <IonText
            color="primary"
            className="ion-text-link"
            onClick={() => window.location.href='/signup'}
          >
            Don’t have an account yet? Sign Up
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
