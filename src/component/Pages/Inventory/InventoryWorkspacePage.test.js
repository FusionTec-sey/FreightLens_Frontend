import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useNavigate } from "react-router-dom";
import InventoryWorkspacePage from "./InventoryWorkspacePage";
import { useAuth } from "../../../context/AuthContext";
import { inventoryLocationsApi } from "../../../services/inventoryLocationsApi";
import { salesDraftsApi } from "../../../services/salesDraftsApi";
jest.mock("../../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: jest.fn() }), { virtual: true });
jest.mock("../../../services/inventoryLocationsApi", () => ({ inventoryLocationsApi: jest.fn(() => ({})) }));
jest.mock("../../../services/salesDraftsApi", () => ({ salesDraftsApi: jest.fn(() => ({ kind: "sales" })) }));
jest.mock("./components/ManagerCases", () => (props) => <button onClick={props.onClose}>Cases {String(props.canActivate)}</button>);
jest.mock("./components/CostPoolSetup", () => (props) => <button onClick={props.onClose}>Pools {props.orgId} {String(props.canManage)}</button>);
jest.mock("./components/ReturnConditionCases", () => (props) => <button onClick={props.onClose}>Return conditions {String(props.canRequest)} {String(props.canReview)} {String(props.canExecute)}</button>);
const navigate = jest.fn();
beforeEach(() => { useNavigate.mockReturnValue(navigate); useAuth.mockReturnValue({ token: "test", orgId: 1, selectedOrgId: 2, permissions: [] }); });

test("approval entry reuses cases without granting activation", () => {
  render(<InventoryWorkspacePage workspace="approvals" />);
  expect(screen.getByRole("button")).toHaveTextContent("Cases false");
  expect(inventoryLocationsApi).toHaveBeenCalledWith("test", 2);
  fireEvent.click(screen.getByRole("button"));
  expect(navigate).toHaveBeenCalledWith("/inventory/locations");
});

test("pool entry uses active organisation and existing write permission", () => {
  useAuth.mockReturnValue({ token: "test", orgId: 1, permissions: ["Manage_InventoryCostPool"] });
  render(<InventoryWorkspacePage workspace="pools" />);
  expect(screen.getByRole("button")).toHaveTextContent("Pools 1 true");
});

test("return condition entry uses the shared sales API and exact action permissions", () => {
  useAuth.mockReturnValue({ token: "test", orgId: 1, userId: 9,
    permissions: ["Review_StockCondition"], isSuperAdmin: false });
  render(<InventoryWorkspacePage workspace="return-conditions" />);
  expect(salesDraftsApi).toHaveBeenCalledWith("test", 1);
  expect(screen.getByRole("button")).toHaveTextContent("Return conditions false true false");
  fireEvent.click(screen.getByRole("button"));
  expect(navigate).toHaveBeenCalledWith("/inventory/locations");
});
