import React from "react";
import { Card, CardBody, Divider } from "@heroui/react";

const SECTIONS = [
  {
    title: "1. Giới thiệu",
    content: "Chào mừng bạn đến với nền tảng của chúng tôi. Khi truy cập hoặc sử dụng dịch vụ, bạn đồng ý tuân thủ các điều khoản và chính sách dưới đây. Vui lòng đọc kỹ trước khi tiếp tục.",
  },
  {
    title: "2. Tài khoản & Bảo mật",
    items: [
      "Người dùng chịu trách nhiệm về bảo mật tài khoản và mật khẩu của mình.",
      "Không được chia sẻ thông tin đăng nhập với bên thứ ba.",
      "Nếu phát hiện hành vi truy cập trái phép, vui lòng thông báo ngay cho quản trị viên.",
    ],
  },
  {
    title: "3. Quyền & Nghĩa vụ người dùng",
    content: "Người dùng cam kết sử dụng dịch vụ đúng mục đích, không vi phạm pháp luật, không phát tán nội dung độc hại, spam hoặc gây ảnh hưởng đến hệ thống và người khác.",
  },
  {
    title: "4. Chính sách bảo mật",
    content: "Chúng tôi cam kết bảo mật thông tin cá nhân của bạn và chỉ sử dụng cho mục đích phục vụ trải nghiệm người dùng. Mọi dữ liệu sẽ được xử lý theo quy định của pháp luật hiện hành.",
  },
  {
    title: "5. Thanh toán & Hoàn tiền",
    content: "Tất cả các giao dịch thanh toán đều được xử lý qua đối tác uy tín. Chính sách hoàn tiền chỉ áp dụng khi có lỗi hệ thống hoặc theo quy định cụ thể của từng dịch vụ.",
  },
  {
    title: "6. Sửa đổi điều khoản",
    content: "Chúng tôi có thể cập nhật các điều khoản này theo thời gian. Mọi thay đổi sẽ được thông báo công khai trên website trước khi áp dụng.",
  },
  {
    title: "7. Liên hệ",
    content: (<>Mọi thắc mắc xin gửi về email: <strong>support@dfs.vn</strong></>),
  },
];

const TermsAndPolicy = () => (
  <div className="max-w-3xl mx-auto px-4 py-8">
    <Card radius="xl" shadow="sm">
      <CardBody className="p-6 md:p-8">
        <h1 className="text-2xl font-black text-primary text-center mb-2">Chính Sách & Điều Khoản Sử Dụng</h1>
        <Divider className="my-6" />
        <div className="space-y-6">
          {SECTIONS.map((s, i) => (
            <div key={i}>
              <h2 className="text-base font-bold text-default-900 mb-2">{s.title}</h2>
              {s.items ? (
                <ul className="space-y-1 text-sm text-default-600">
                  {s.items.map((item, j) => <li key={j} className="flex gap-2"><span className="text-primary">•</span>{item}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-default-600 leading-relaxed">{s.content}</p>
              )}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  </div>
);

export default TermsAndPolicy;
