export async function GET() {
  const data = {
    summary: {
      totalSales: 392740,
      todaySales: 31720,
      cancelAmount: 5380,
      targetValue: 500000,
    },
    orders: [
      { id: "ORD-2051", customer: "Nusrat Jahan", amount: 9600, status: "Pending", time: "Just now" },
      { id: "ORD-2050", customer: "Rafiul Karim", amount: 15400, status: "Confirmed", time: "11 min ago" },
      { id: "ORD-2048", customer: "Mim Akter", amount: 4100, status: "Cancelled", time: "39 min ago" },
      { id: "ORD-2046", customer: "Mahim Rahman", amount: 8800, status: "Confirmed", time: "1 hour ago" },
    ],
    inventory: [
      {
        code: "LX-BAG-1001",
        name: "Premium Handbag",
        stock: 20,
        image:
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=240&q=60",
      },
      {
        code: "LX-SHOE-204",
        name: "Runner Shoes",
        stock: 8,
        image:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=240&q=60",
      },
      {
        code: "LX-WAT-412",
        name: "Classic Watch",
        stock: 0,
        image:
          "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=240&q=60",
      },
      {
        code: "LX-WAL-909",
        name: "Leather Wallet",
        stock: 29,
        image:
          "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=240&q=60",
      },
    ],
  };

  return Response.json(data, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}