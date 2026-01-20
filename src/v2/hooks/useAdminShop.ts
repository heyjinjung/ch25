import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminProductCreateRequest,
  AdminProductUpdateRequest,
  createAdminProduct,
  deleteAdminProduct,
  getAdminProducts,
  syncAdminProducts,
  updateAdminProduct,
} from "../api/adminApi";

export const useAdminProducts = () => {
  return useQuery({
    queryKey: ["admin", "products"],
    queryFn: getAdminProducts,
  });
};

export const useAdminCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminProductCreateRequest) => createAdminProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
};

export const useAdminUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }: { productId: number; data: AdminProductUpdateRequest }) =>
      updateAdminProduct(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
};

export const useAdminDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => deleteAdminProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
};

export const useAdminSyncProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncAdminProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
};
