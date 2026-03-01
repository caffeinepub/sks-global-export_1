import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
    currentCompanyId?: string;
}
export type BillId = string;
export interface Customer {
    id: CustomerId;
    name: string;
    email: string;
    phone: string;
}
export interface InventoryItem {
    id: ProductId;
    quantity: bigint;
    product: Product;
}
export type CustomerId = string;
export type InvoiceId = string;
export type ProductId = string;
export type PickupId = string;
export interface Product {
    id: ProductId;
    name: string;
    stock: bigint;
    category: string;
    price: bigint;
}
export type VendorId = string;
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCustomer(id: CustomerId, name: string, phone: string, email: string): Promise<void>;
    addProduct(productId: ProductId, name: string, category: string, price: bigint, stock: bigint): Promise<void>;
    addToInventory(productId: ProductId, quantity: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    confirmPickup(pickupId: PickupId): Promise<void>;
    createBill(id: BillId, customerId: CustomerId, itemIds: Array<ProductId>, total: bigint): Promise<void>;
    createInvoice(id: InvoiceId, billIds: Array<BillId>, total: bigint, gst: boolean): Promise<void>;
    createPickup(id: PickupId, vendorId: VendorId, productIds: Array<ProductId>, confirmed: boolean): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomers(): Promise<Array<Customer>>;
    getInventoryItems(): Promise<Array<InventoryItem>>;
    getProduct(productId: ProductId): Promise<Product | null>;
    getProducts(): Promise<Array<Product>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    processReturn(_billId: BillId, returnedProductIds: Array<ProductId>): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
