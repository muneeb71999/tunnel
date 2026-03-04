"use client";

import pb from "./pocketbase";

export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

export function getCurrentUser() {
  return pb.authStore.record;
}

export async function login(email: string, password: string) {
  return pb.collection("users").authWithPassword(email, password);
}

export async function register(email: string, password: string, name: string) {
  const user = await pb.collection("users").create({
    email,
    password,
    passwordConfirm: password,
    name,
  });
  await login(email, password);
  return user;
}

export function logout() {
  pb.authStore.clear();
}
