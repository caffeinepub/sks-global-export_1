import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  include MixinStorage();

  // Access Control State
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types
  type CompanyId = Text;
  type ProductId = Text;
  type CustomerId = Text;
  type VendorId = Text;
  type BillId = Text;
  type InvoiceId = Text;
  type PickupId = Text;
  public type UserProfile = {
    name : Text;
    currentCompanyId : ?Text;
  };

  // Storage Structures
  let customers = Map.empty<CustomerId, Customer>();
  let vendors = Map.empty<VendorId, Vendor>();
  let bills = Map.empty<BillId, Bill>();
  let invoices = Map.empty<InvoiceId, Invoice>();
  let pickups = Map.empty<PickupId, Pickup>();
  let products = Map.empty<ProductId, Product>();
  let inventory = Map.empty<ProductId, InventoryItem>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let pickupStatus = Map.empty<PickupId, Bool>();

  // Entities
  module Product {
    public type Product = {
      id : ProductId;
      name : Text;
      category : Text;
      price : Nat;
      stock : Nat;
    };

    public func compareById(p1 : Product, p2 : Product) : Order.Order {
      Text.compare(p1.id, p2.id);
    };

    public func compareByName(p1 : Product, p2 : Product) : Order.Order {
      Text.compare(p1.name, p2.name);
    };
  };
  type Product = Product.Product;

  module Customer {
    public type Customer = {
      id : CustomerId;
      name : Text;
      phone : Text;
      email : Text;
    };

    public func compareByName(c1 : Customer, c2 : Customer) : Order.Order {
      Text.compare(c1.name, c2.name);
    };
  };
  type Customer = Customer.Customer;

  module Vendor {
    public type Vendor = {
      id : VendorId;
      name : Text;
      phone : Text;
      email : Text;
    };
  };
  type Vendor = Vendor.Vendor;

  module Bill {
    public type Bill = {
      id : BillId;
      customerId : CustomerId;
      items : [ProductId];
      total : Nat;
      paid : Bool;
    };
  };
  type Bill = Bill.Bill;

  module Invoice {
    public type Invoice = {
      id : InvoiceId;
      bills : [BillId];
      total : Nat;
      gst : Bool;
    };
  };
  type Invoice = Invoice.Invoice;

  module Pickup {
    public type Pickup = {
      id : PickupId;
      vendorId : VendorId;
      productIds : [ProductId];
      confirmed : Bool;
    };
  };
  type Pickup = Pickup.Pickup;

  type InventoryItem = {
    id : ProductId;
    product : Product;
    quantity : Nat;
  };

  // Authorization Checks
  func mustBeAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
  };

  func mustBeUser(caller : Principal) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    mustBeUser(caller);
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user) { mustBeAdmin(caller) };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    mustBeUser(caller);
    userProfiles.add(caller, profile);
  };

  // Product CRUD
  public shared ({ caller }) func addProduct(productId : ProductId, name : Text, category : Text, price : Nat, stock : Nat) : async () {
    mustBeUser(caller);
    if (products.containsKey(productId)) {
      Runtime.trap("Product already exists");
    };
    let product : Product = {
      id = productId;
      name;
      category;
      price;
      stock;
    };
    products.add(productId, product);
  };

  public query ({ caller }) func getProduct(productId : ProductId) : async ?Product {
    mustBeUser(caller);
    products.get(productId);
  };

  public query ({ caller }) func getProducts() : async [Product] {
    mustBeUser(caller);
    products.values().toArray();
  };

  // Customer CRUD
  public shared ({ caller }) func addCustomer(id : CustomerId, name : Text, phone : Text, email : Text) : async () {
    mustBeUser(caller);
    if (customers.containsKey(id)) {
      Runtime.trap("Customer already exists");
    };
    let customer : Customer = {
      id;
      name;
      phone;
      email;
    };
    customers.add(id, customer);
  };

  public query ({ caller }) func getCustomers() : async [Customer] {
    mustBeUser(caller);
    customers.values().toArray().sort(Customer.compareByName);
  };

  // Bills & Invoices
  public shared ({ caller }) func createBill(id : BillId, customerId : CustomerId, itemIds : [ProductId], total : Nat) : async () {
    mustBeUser(caller);
    let bill : Bill = {
      id;
      customerId;
      items = itemIds;
      total;
      paid = false;
    };
    bills.add(id, bill);
  };

  public shared ({ caller }) func createInvoice(id : InvoiceId, billIds : [BillId], total : Nat, gst : Bool) : async () {
    mustBeUser(caller);
    let invoice : Invoice = {
      id;
      bills = billIds;
      total;
      gst;
    };
    invoices.add(id, invoice);
  };

  // Inventory Management
  public shared ({ caller }) func addToInventory(productId : ProductId, quantity : Nat) : async () {
    mustBeUser(caller);
    let product = switch (products.get(productId)) {
      case (?p) { p };
      case (null) { Runtime.trap("Product does not exist") };
    };

    inventory.add(productId, {
      id = productId;
      product;
      quantity;
    });
  };

  public query ({ caller }) func getInventoryItems() : async [InventoryItem] {
    mustBeUser(caller);
    inventory.values().toArray();
  };

  // Pickup Management
  public shared ({ caller }) func createPickup(id : PickupId, vendorId : VendorId, productIds : [ProductId], confirmed : Bool) : async () {
    mustBeUser(caller);
    let pickup : Pickup = {
      id;
      vendorId;
      productIds;
      confirmed;
    };
    pickups.add(id, pickup);
  };

  public shared ({ caller }) func confirmPickup(pickupId : PickupId) : async () {
    mustBeUser(caller);
    let pickup = switch (pickups.get(pickupId)) {
      case (?p) { p };
      case (null) { Runtime.trap("Pickup does not exist") };
    };
    let updatedPickup = {
      id = pickup.id;
      vendorId = pickup.vendorId;
      productIds = pickup.productIds;
      confirmed = true;
    };
    pickups.add(pickupId, updatedPickup);
  };

  public shared ({ caller }) func processReturn(_billId : BillId, returnedProductIds : [ProductId]) : async () {
    mustBeUser(caller);
    for (productId in returnedProductIds.values()) {
      let item = switch (inventory.get(productId)) {
        case (?i) { i };
        case (null) { Runtime.trap("Product not found in inventory") };
      };
      inventory.add(productId, {
        id = productId;
        product = item.product;
        quantity = item.quantity + 1;
      });
    };
  };
};
