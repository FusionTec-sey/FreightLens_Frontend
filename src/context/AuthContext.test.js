import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import { AuthProvider, useAuth } from "./AuthContext";
jest.mock("axios", () => ({ get: jest.fn(), post: jest.fn(), interceptors: {
  request: { use: jest.fn(), eject: jest.fn() }, response: { use: jest.fn(), eject: jest.fn() },
} }));

function Probe() {
  const auth = useAuth();
  return <><p>{auth.accessLoading ? "loading" : auth.accessError ? "failed" : auth.permissions.join(",")}</p>
    <button onClick={auth.retryAccess}>Retry</button>
    <button onClick={() => auth.setSelectedOrgId(2)}>Switch company</button></>;
}
beforeEach(() => { localStorage.clear(); localStorage.setItem("token", "synthetic-test-token"); axios.get.mockReset(); });
test("failed access can be retried without retaining historical permissions", async () => {
  axios.get.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ data: { permissions: ["View_Product"], modules: ["INVENTORY"] } });
  render(<AuthProvider><Probe /></AuthProvider>);
  expect(await screen.findByText("failed")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Retry"));
  expect(await screen.findByText("View_Product")).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledTimes(2);
});
test("late responses from the previous company cannot replace current access", async () => {
  let resolveOld;
  axios.get.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ data: { permissions: ["CurrentCompany"] } });
  render(<AuthProvider><Probe /></AuthProvider>);
  fireEvent.click(screen.getByText("Switch company"));
  await waitFor(() => expect(screen.getByText("CurrentCompany")).toBeInTheDocument());
  await act(async () => resolveOld({ data: { permissions: ["OldCompany"], is_platform_admin: true } }));
  expect(screen.queryByText("OldCompany")).not.toBeInTheDocument();
  expect(screen.getByText("CurrentCompany")).toBeInTheDocument();
});
