import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PolicyActivation from "./PolicyActivation";
jest.mock("axios", () => ({ create: jest.fn(() => ({})) }));
let api;
beforeEach(() => {
  api = { activatePolicy: jest.fn() };
  Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: jest.fn(() => "activation-key") } });
});

test("reviewed unit extension explains preserved stock before explicit confirmation", () => {
  render(<PolicyActivation api={api} caseKey="extension" expectedActiveVersion={1} transition="EXTEND_UNITS" onBusyChange={jest.fn()} onActivated={jest.fn()} />);
  expect(screen.getByText(/Adds alternate units only/)).toHaveTextContent("reservations and barcode meanings remain unchanged");
  expect(screen.getByRole("button", { name: "Activate reviewed policy" })).toBeDisabled();
});

test("barcode retirement requires explicit confirmation and uses only the retirement endpoint", async () => {
  api.retireBarcode = jest.fn().mockResolvedValue({});
  const done = jest.fn();
  render(<PolicyActivation retirement api={api} caseKey="retirement" onBusyChange={jest.fn()} onActivated={done} />);
  expect(screen.getByRole("button", { name: "Retire reviewed barcode" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Retire reviewed barcode" }));
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  expect(api.retireBarcode).toHaveBeenCalledWith("retirement", { operation_key: "activation-key", expected_source_version: 1 }, expect.any(AbortSignal));
  expect(api.activatePolicy).not.toHaveBeenCalled();
});

test("activation needs explicit confirmation and preserves the retry identity", async () => {
  api.activatePolicy.mockRejectedValue({ response: { data: { detail: "Stock needs reconciliation" } } });
  render(<PolicyActivation api={api} caseKey="case" onBusyChange={jest.fn()} onActivated={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Activate reviewed policy" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Activate reviewed policy" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Stock needs reconciliation");
  fireEvent.click(screen.getByRole("button", { name: "Activate reviewed policy" }));
  await waitFor(() => expect(api.activatePolicy).toHaveBeenCalledTimes(2));
  expect(api.activatePolicy.mock.calls[0][1]).toEqual(api.activatePolicy.mock.calls[1][1]);
});

test("successful activation refreshes the case without duplicate submission", async () => {
  let finish;
  api.activatePolicy.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const done = jest.fn(), busy = jest.fn();
  render(<PolicyActivation api={api} caseKey="case" onBusyChange={busy} onActivated={done} />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Activate reviewed policy" }));
  fireEvent.click(screen.getByRole("button", { name: "Activating…" }));
  expect(api.activatePolicy).toHaveBeenCalledTimes(1);
  finish({});
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  expect(busy).toHaveBeenLastCalledWith(false);
});

test("revision posts the predecessor version approved in the case", async () => {
  api.activatePolicy.mockResolvedValue({});
  render(<PolicyActivation api={api} caseKey="revision" expectedActiveVersion={3} onBusyChange={jest.fn()} onActivated={jest.fn()} />);
  expect(screen.getByText(/Replaces active policy version 3/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(api.activatePolicy).toHaveBeenCalledWith("revision", expect.objectContaining({ expected_active_version: 3 }), expect.any(AbortSignal)));
});

test('follow-up scheduling requires confirmation and does not call policy activation', async () => {
  api.scheduleDeadline = jest.fn().mockResolvedValue({}); const done = jest.fn();
  render(<PolicyActivation deadline api={api} caseKey="deadline" onBusyChange={jest.fn()} onActivated={done} />);
  expect(screen.getByText('Schedule reviewed follow-up')).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByText('Schedule reviewed follow-up'));
  await waitFor(() => expect(done).toHaveBeenCalled());
  expect(api.scheduleDeadline).toHaveBeenCalledWith('deadline', { operation_key: 'activation-key' }, expect.any(AbortSignal));
  expect(api.activatePolicy).not.toHaveBeenCalled();
});

test('approved release requires confirmation and retains its operation after an uncertain result', async () => {
  api.executeRelease = jest.fn().mockResolvedValueOnce({ data: {} }).mockResolvedValue({ data: {
    operation_key: 'activation-key', case_key: 'release', status: 'CONSUMED',
  } });
  const done = jest.fn();
  render(<PolicyActivation reservationRelease api={api} caseKey="release" onBusyChange={jest.fn()} onActivated={done} />);
  expect(screen.getByRole('button', { name: 'Execute approved release' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Execute approved release' }));
  await screen.findByRole('alert');
  expect(done).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Execute approved release' }));
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  expect(api.executeRelease.mock.calls[0][1]).toEqual({ operation_key: 'activation-key' });
  expect(api.executeRelease.mock.calls[1][1]).toEqual(api.executeRelease.mock.calls[0][1]);
  expect(api.activatePolicy).not.toHaveBeenCalled();
});

test('disabled stock runtime leaves release unconfirmed', async () => {
  api.executeRelease = jest.fn().mockRejectedValue({ response: { status: 503, data: { detail: 'Local stock execution is disabled' } } });
  const done = jest.fn();
  render(<PolicyActivation reservationRelease api={api} caseKey="release" onBusyChange={jest.fn()} onActivated={done} />);
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Local stock execution is disabled');
  expect(done).not.toHaveBeenCalled();
});
