import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useAuth } from "../context/AuthContext";
import PrivateRoute from "./PrivateRoute";
jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("react-router-dom", () => ({ Navigate: ({ to }) => <p>Redirect: {to}</p> }), { virtual: true });

test("access failure blocks stale admin rights and offers retry without redirecting", () => {
  const retryAccess = jest.fn();
  useAuth.mockReturnValue({ token: "test", accessError: true, isSuperAdmin: true, retryAccess });
  render(<PrivateRoute><p>Protected</p></PrivateRoute>);
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to verify access");
  expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  expect(screen.queryByText(/Redirect:/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
  expect(retryAccess).toHaveBeenCalledTimes(1);
});
test("waits for permissions before routing and before trusting old admin access", () => {
  useAuth.mockReturnValue({ token: "test", accessLoading: true, isSuperAdmin: true });
  const { rerender } = render(<PrivateRoute requiredPermissions={["View_Product"]}><p>Protected</p></PrivateRoute>);
  expect(screen.getByRole("status")).toHaveTextContent("Loading access");
  expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  useAuth.mockReturnValue({ token: "test", accessLoading: false, permissions: ["View_Product"] });
  rerender(<PrivateRoute requiredPermissions={["View_Product"]}><p>Protected</p></PrivateRoute>);
  expect(screen.getByText("Protected")).toBeInTheDocument();
});
test("settled denial stays denied and missing session redirects to login", () => {
  useAuth.mockReturnValue({ token: "test", accessLoading: false, permissions: [] });
  const { rerender } = render(<PrivateRoute requiredPermissions={["View_Product"]}><p>Protected</p></PrivateRoute>);
  expect(screen.getByText("Redirect: /unauthorized")).toBeInTheDocument();
  useAuth.mockReturnValue({ token: null, accessLoading: true });
  rerender(<PrivateRoute><p>Protected</p></PrivateRoute>);
  expect(screen.getByText("Redirect: /")).toBeInTheDocument();
});
