import React, { useState, useEffect, useCallback, useMemo } from "react";
import { registerShop } from "../services/shopService";
import {
    Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Button, Input, Textarea, Select, SelectItem, Card, CardBody, Avatar
} from "@heroui/react";
import { Store, Info, CheckCircle, MapPin, Globe, Phone, Mail, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { addressService } from "../services/addressService";
import AddressDialog from "./AddressDialog";

// Helper stays outside, no hooks here
const slugify = (str) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

export default function ShopRegisterDialog({ open, onClose, user }) {
    const { t } = useTranslation();
    const [shopName, setShopName] = useState("");
    const [slug, setSlug] = useState("");
    const [phone, setPhone] = useState(user?.phone || "");
    const [email, setEmail] = useState(user?.email || "");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("idle");
    const [addresses, setAddresses] = useState([]);
    const [addressId, setAddressId] = useState("");
    const [addAddressOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);

    const load = useCallback(async () => {
        try {
            const list = await addressService.list();
            setAddresses(Array.isArray(list) ? list : []);
        } catch (e) {
            toast.error(t("profile.address_load_failed"));
        }
    }, [t]);

    useEffect(() => {
        if (open) {
            load();
            setStatus("idle");
        }
    }, [open, load]);

    useEffect(() => {
        setSlug(slugify(shopName));
    }, [shopName]);

    const handleSubmit = async () => {
        if (!shopName.trim() || !slug.trim() || !phone.trim() || !addressId) {
            toast.error("Please fill all required fields");
            return;
        }
        try {
            setStatus("submitting");
            const res = await registerShop({
                shop_name: shopName.trim(),
                slug: slug.trim(),
                phone,
                email,
                description,
                address_id: addressId
            });

            toast.success("Shop registration submitted");
            setStatus("success");
        } catch (e) {
            toast.error(e.message);
            setStatus("idle");
        }
    };

    const handleAddressSubmit = async (payload) => {
        try {
            if (editTarget) {
                await addressService.update(editTarget._id, payload);
                toast.success(t("profile.address_updated"));
            } else {
                await addressService.create(payload);
                toast.success(t("profile.address_added"));
            }
            setDialogOpen(false);
            setEditTarget(null);
            await load();
        } catch (e) {
            throw e; // let AddressDialog show the error
        }
    };

    return (
        <>
            <Modal isOpen={open} onClose={onClose} size="2xl" scrollBehavior="inside" backdrop="blur">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 border-b pb-4">
                        <div className="flex items-center gap-3 text-primary">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Store size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Register Your Shop</h3>
                                <p className="text-small text-default-500 font-normal">Fill in the details to start selling</p>
                            </div>
                        </div>
                    </ModalHeader>

                    <ModalBody className="py-6">
                        {status !== "success" ? (
                            <div className="space-y-6">
                                {/* REAL-TIME PREVIEW CARD */}
                                <Card className="bg-default-50 border-none shadow-none">
                                    <CardBody className="flex flex-row items-center gap-4">
                                        <Avatar
                                            src={user?.avatar_url}
                                            className="w-16 h-16 text-large"
                                            isBordered
                                            color="primary"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-lg font-bold">{shopName || "Your Shop Name"}</span>
                                            <span className="text-small text-primary flex items-center gap-1">
                                                <Globe size={12} /> heroui.com/shop/{slug || "slug"}
                                            </span>
                                        </div>
                                    </CardBody>
                                </Card>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Shop Name"
                                        placeholder="Enter shop name"
                                        labelPlacement="outside"
                                        value={shopName}
                                        onValueChange={setShopName}
                                        isRequired
                                        variant="bordered"
                                    />
                                    <Input
                                        label="URL Slug"
                                        placeholder="shop-url-path"
                                        labelPlacement="outside"
                                        value={slug}
                                        isDisabled
                                        variant="flat"
                                        description="Automatically generated from name"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Contact Phone"
                                        placeholder="0123..."
                                        labelPlacement="outside"
                                        value={phone}
                                        onValueChange={setPhone}
                                        isRequired
                                        variant="bordered"
                                        startContent={<Phone size={16} className="text-default-400" />}
                                    />
                                    <Input
                                        label="Business Email"
                                        placeholder="shop@example.com"
                                        labelPlacement="outside"
                                        value={email}
                                        onValueChange={setEmail}
                                        variant="bordered"
                                        startContent={<Mail size={16} className="text-default-400" />}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <label className="text-small font-medium text-foreground">Pickup Address</label>
                                        <Button
                                            size="sm"
                                            variant="light"
                                            color="primary"
                                            startContent={<Plus size={16} />}
                                            onPress={() => setDialogOpen(true)}
                                        >
                                            New Address
                                        </Button>
                                    </div>
                                    <Select
                                        placeholder="Select shop address"
                                        aria-label="Address"
                                        selectedKeys={addressId ? [addressId] : []}
                                        onSelectionChange={(keys) => setAddressId(Array.from(keys)[0])}
                                        variant="bordered"
                                        startContent={<MapPin size={18} className="text-danger" />}
                                    >
                                        {addresses.map((a) => (
                                            <SelectItem key={a._id} textValue={a.street}>
                                                <div className="flex flex-col">
                                                    <span className="text-small">{a.name} - {a.phone}</span>
                                                    <span className="text-tiny text-default-400">{a.street}, {a.ward}, {a.city}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </Select>
                                </div>

                                <Textarea
                                    label="Shop Description"
                                    placeholder="Tell customers about your business..."
                                    labelPlacement="outside"
                                    value={description}
                                    onValueChange={setDescription}
                                    variant="bordered"
                                    minRows={3}
                                />

                                <div className="flex gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-700">
                                    <Info size={18} className="shrink-0 mt-0.5" />
                                    <p className="text-tiny">
                                        Your shop will enter a **review phase** after submission. We usually approve businesses within 24-48 hours.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-20 h-20 rounded-full bg-success-50 flex items-center justify-center mb-6 animate-pulse">
                                    <CheckCircle size={48} className="text-success" />
                                </div>
                                <h3 className="text-2xl font-bold text-foreground">Application Sent!</h3>
                                <p className="text-default-500 mt-2 max-w-[280px]">
                                    We've received your request. Please keep an eye on your email for the approval status.
                                </p>
                            </div>
                        )}
                    </ModalBody>

                    <ModalFooter className="border-t">
                        {status === "success" ? (
                            <Button color="primary" onPress={onClose} className="w-full font-bold">
                                Got it
                            </Button>
                        ) : (
                            <>
                                <Button variant="flat" onPress={onClose}>Cancel</Button>
                                <Button
                                    isDisabled={status === "submitting"}
                                    color="primary"
                                    onPress={handleSubmit}
                                    isLoading={status === "submitting"}
                                    className="px-8 font-bold"
                                    startContent={status !== "submitting" && <Store size={18} />}
                                >
                                    Submit Application
                                </Button>
                            </>
                        )}
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <AddressDialog
                open={addAddressOpen}
                initial={editTarget}
                onClose={() => { setAddAddressOpen(false); setEditTarget(null); }}
                onSubmit={handleAddressSubmit}
            />
        </>
    );
}