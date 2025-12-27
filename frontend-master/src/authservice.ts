import { auth } from "../src/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    console.log("Token:", token);
    return token;
  } catch (error) {
    console.error(error);
    throw error;
  }
};