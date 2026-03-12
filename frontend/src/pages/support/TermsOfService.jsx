import React, { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Chip,
  Accordion,
  AccordionItem,
  ScrollShadow,
} from "@heroui/react";
import {
  FiShield,
  FiUser,
  FiCreditCard,
  FiTruck,
  FiRefreshCw,
  FiAlertTriangle,
  FiBookOpen,
  FiEdit3,
  FiPhone,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
} from "react-icons/fi";

const UPDATED_DATE = "13/03/2026";

const TOC = [
  { id: "s1", label: "Giới thiệu & phạm vi" },
  { id: "s2", label: "Tài khoản & bảo mật" },
  { id: "s3", label: "Quyền & nghĩa vụ" },
  { id: "s4", label: "Đặt hàng & thanh toán" },
  { id: "s5", label: "Vận chuyển & giao hàng" },
  { id: "s6", label: "Đổi trả & hoàn tiền" },
  { id: "s7", label: "Chính sách người bán" },
  { id: "s8", label: "Sở hữu trí tuệ" },
  { id: "s9", label: "Giới hạn trách nhiệm" },
  { id: "s10", label: "Sửa đổi điều khoản" },
  { id: "s11", label: "Liên hệ hỗ trợ" },
];

const InfoBox = ({ icon: Icon, colorClass, bgClass, children }) => (
  <div className={`flex gap-3 p-3 rounded-lg mt-3 ${bgClass}`}>
    <Icon size={16} className={`mt-0.5 shrink-0 ${colorClass}`} />
    <p className={`text-sm leading-relaxed ${colorClass}`}>{children}</p>
  </div>
);

const BulletList = ({ items }) => (
  <ul className="space-y-2 mt-2">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2 text-sm text-default-600">
        <FiCheckCircle size={15} className="text-primary shrink-0 mt-0.5" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const NoList = ({ items }) => (
  <ul className="space-y-2 mt-2">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2 text-sm text-default-600">
        <FiXCircle size={15} className="text-danger shrink-0 mt-0.5" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const SectionTitle = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="p-1.5 rounded-lg bg-primary/10">
      <Icon size={16} className="text-primary" />
    </div>
    <h2 className="text-base font-semibold text-default-900">{title}</h2>
  </div>
);

const TermsOfService = () => {
  const [activeSection, setActiveSection] = useState(null);

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Header */}
      <Card radius="xl" shadow="sm">
        <CardBody className="p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-2xl bg-primary/10">
              <FiBookOpen size={28} className="text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-primary mb-1">
            Điều Khoản Dịch Vụ
          </h1>
          <p className="text-sm text-default-500 mb-3">
            Áp dụng cho toàn bộ người dùng nền tảng thương mại điện tử DFS.vn
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Chip size="sm" variant="flat" color="primary">
              Cập nhật: {UPDATED_DATE}
            </Chip>
            <Chip size="sm" variant="flat" color="success">
              Phiên bản 3.0
            </Chip>
            <Chip size="sm" variant="flat" color="default">
              Áp dụng toàn quốc
            </Chip>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* TOC Sidebar */}
        <div className="lg:w-56 shrink-0">
          <Card radius="xl" shadow="sm" className="lg:sticky lg:top-4">
            <CardHeader className="pb-1 pt-4 px-4">
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider">
                Mục lục
              </p>
            </CardHeader>
            <CardBody className="pt-1 pb-4 px-3">
              <ScrollShadow className="max-h-[400px]">
                <nav className="flex flex-col gap-0.5">
                  {TOC.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollTo(item.id)}
                      className={`text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                        activeSection === item.id
                          ? "bg-primary text-white font-medium"
                          : "text-default-600 hover:bg-default-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </ScrollShadow>
            </CardBody>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Section 1 */}
          <Card id="s1" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiInfo} title="1. Giới thiệu & phạm vi áp dụng" />
              <p className="text-sm text-default-600 leading-relaxed">
                Chào mừng bạn đến với DFS.vn – nền tảng thương mại điện tử kết
                nối người mua và người bán tại Việt Nam. Điều khoản này áp dụng
                cho toàn bộ hoạt động mua bán, đăng ký tài khoản, thanh toán và
                sử dụng mọi tính năng trên website DFS.vn.
              </p>
              <InfoBox
                icon={FiInfo}
                colorClass="text-primary"
                bgClass="bg-primary/5 border border-primary/20"
              >
                Bằng cách tạo tài khoản hoặc hoàn tất giao dịch, bạn xác nhận
                đã đọc, hiểu và đồng ý với toàn bộ nội dung trong tài liệu này.
              </InfoBox>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 bg-default-50 rounded-lg border border-default-200">
                  <p className="text-xs text-default-400 mb-1">Đối tượng</p>
                  <p className="text-sm font-medium">Người mua, người bán, khách vãng lai</p>
                </div>
                <div className="p-3 bg-default-50 rounded-lg border border-default-200">
                  <p className="text-xs text-default-400 mb-1">Phạm vi</p>
                  <p className="text-sm font-medium">Toàn lãnh thổ Việt Nam</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Section 2 */}
          <Card id="s2" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiShield} title="2. Tài khoản & bảo mật" />
              <BulletList
                items={[
                  "Mỗi người dùng chỉ được đăng ký một (1) tài khoản duy nhất bằng số điện thoại hoặc email hợp lệ.",
                  "Người dùng chịu hoàn toàn trách nhiệm về bảo mật thông tin đăng nhập (tên đăng nhập, mật khẩu, mã OTP).",
                  "Không được chuyển nhượng, cho thuê hoặc chia sẻ tài khoản cho bất kỳ bên thứ ba nào.",
                  "Kích hoạt xác thực 2 lớp (2FA) được khuyến nghị để tăng cường bảo mật.",
                  "Nếu phát hiện truy cập trái phép, phải thông báo ngay cho bộ phận hỗ trợ trong vòng 24 giờ.",
                ]}
              />
              <InfoBox
                icon={FiAlertTriangle}
                colorClass="text-warning-700"
                bgClass="bg-warning-50 border border-warning-200"
              >
                DFS.vn không bao giờ yêu cầu mật khẩu hay mã OTP qua điện
                thoại, email hoặc tin nhắn. Mọi yêu cầu như vậy đều là lừa đảo.
              </InfoBox>
            </CardBody>
          </Card>

          {/* Section 3 */}
          <Card id="s3" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiUser} title="3. Quyền & nghĩa vụ người dùng" />
              <Accordion variant="light" isCompact>
                <AccordionItem
                  key="rights"
                  title={
                    <span className="text-sm font-medium text-default-700">
                      Quyền của người dùng
                    </span>
                  }
                >
                  <BulletList
                    items={[
                      "Duyệt sản phẩm, so sánh giá và mua hàng theo đúng quy trình của nền tảng.",
                      "Đánh giá sản phẩm và phản hồi chất lượng dịch vụ một cách trung thực.",
                      "Yêu cầu hỗ trợ, khiếu nại khi phát sinh tranh chấp với người bán.",
                      "Nhận thông báo về các chương trình khuyến mãi và ưu đãi đặc biệt.",
                    ]}
                  />
                </AccordionItem>
                <AccordionItem
                  key="duties"
                  title={
                    <span className="text-sm font-medium text-default-700">
                      Nghĩa vụ của người dùng
                    </span>
                  }
                >
                  <NoList
                    items={[
                      "Không đăng tải nội dung vi phạm pháp luật, nội dung phản cảm, kích động thù địch.",
                      "Không sử dụng bot, phần mềm tự động để gian lận điểm thưởng, đánh giá ảo.",
                      "Không thực hiện hành vi gian lận thanh toán, hoàn tiền gian lận hoặc lừa đảo người bán.",
                      "Không cung cấp thông tin sai lệch khi đăng ký tài khoản hoặc đặt hàng.",
                    ]}
                  />
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>

          {/* Section 4 */}
          <Card id="s4" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiCreditCard} title="4. Đặt hàng & thanh toán" />
              <BulletList
                items={[
                  "Đơn hàng được xác nhận sau khi thanh toán thành công hoặc người bán chấp nhận (đối với COD).",
                  "Giá sản phẩm đã bao gồm VAT theo quy định, chưa bao gồm phí vận chuyển.",
                  "Người mua có thể hủy đơn trong vòng 2 giờ nếu đơn chưa được xử lý.",
                ]}
              />
              <Divider className="my-3" />
              <p className="text-xs font-semibold text-default-400 uppercase tracking-wider mb-2">
                Phương thức thanh toán được chấp nhận
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Visa / Mastercard", color: "primary" },
                  { label: "Thẻ ATM nội địa", color: "primary" },
                  { label: "MoMo", color: "secondary" },
                  { label: "VNPay", color: "secondary" },
                  { label: "ZaloPay", color: "secondary" },
                  { label: "COD", color: "warning" },
                  { label: "Chuyển khoản", color: "default" },
                  { label: "Trả góp 0%", color: "success" },
                ].map((item) => (
                  <Chip key={item.label} size="sm" variant="flat" color={item.color}>
                    {item.label}
                  </Chip>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Section 5 */}
          <Card id="s5" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiTruck} title="5. Vận chuyển & giao hàng" />
              <BulletList
                items={[
                  "Thời gian giao hàng từ 1–7 ngày làm việc (nội thành: 1–2 ngày, ngoại tỉnh: 3–7 ngày).",
                  "Người bán bàn giao hàng cho đơn vị vận chuyển trong 24–48 giờ sau khi xác nhận đơn.",
                  "Người mua theo dõi trạng thái đơn real-time qua ứng dụng hoặc website.",
                  "Miễn phí vận chuyển cho đơn hàng từ 300.000đ (áp dụng theo từng chương trình).",
                  "Phí giao hàng lần 2 do người mua chịu nếu lỗi địa chỉ từ phía người mua.",
                ]}
              />
              <InfoBox
                icon={FiAlertTriangle}
                colorClass="text-warning-700"
                bgClass="bg-warning-50 border border-warning-200"
              >
                Hàng dễ vỡ hoặc có giá trị cao cần mua thêm gói bảo hiểm vận
                chuyển trước khi đặt đơn.
              </InfoBox>
            </CardBody>
          </Card>

          {/* Section 6 */}
          <Card id="s6" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiRefreshCw} title="6. Chính sách đổi trả & hoàn tiền" />
              <BulletList
                items={[
                  "Người mua được yêu cầu đổi/trả trong 7 ngày từ ngày nhận hàng nếu sản phẩm lỗi, sai mô tả.",
                  "Sản phẩm trả về phải còn nguyên tem nhãn, chưa qua sử dụng và đầy đủ phụ kiện.",
                  "Hoàn tiền được xử lý trong 3–7 ngày làm việc sau khi yêu cầu được duyệt.",
                  "Hoàn tiền qua cùng phương thức thanh toán ban đầu.",
                ]}
              />
              <Divider className="my-3" />
              <p className="text-sm font-medium text-default-700 mb-2">
                Không áp dụng đổi trả với:
              </p>
              <NoList
                items={[
                  "Sản phẩm đã qua sử dụng hoặc hư hỏng do người dùng.",
                  "Thực phẩm, mỹ phẩm đã mở seal.",
                  "Sản phẩm số, phần mềm, thẻ nạp đã kích hoạt.",
                  "Đồ lót, đồ bơi và các sản phẩm liên quan đến vệ sinh cá nhân.",
                ]}
              />
            </CardBody>
          </Card>

          {/* Section 7 */}
          <Card id="s7" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiUser} title="7. Chính sách dành cho người bán" />
              <BulletList
                items={[
                  "Người bán cung cấp đầy đủ giấy tờ kinh doanh hợp lệ (CCCD hoặc đăng ký doanh nghiệp).",
                  "Tuyệt đối không đăng bán hàng giả, hàng nhái, hàng cấm theo pháp luật Việt Nam.",
                  "Mô tả sản phẩm, hình ảnh phải trung thực, không gây nhầm lẫn cho người mua.",
                  "Người bán chịu trách nhiệm pháp lý về nguồn gốc và chất lượng sản phẩm đăng bán.",
                  "Vi phạm chính sách sẽ bị cảnh báo, hạn chế tính năng hoặc khóa tài khoản vĩnh viễn.",
                ]}
              />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 bg-default-50 rounded-lg border border-default-200">
                  <p className="text-xs text-default-400 mb-1">Hoa hồng nền tảng</p>
                  <p className="text-sm font-semibold text-primary">2% – 5% / đơn hàng</p>
                </div>
                <div className="p-3 bg-default-50 rounded-lg border border-default-200">
                  <p className="text-xs text-default-400 mb-1">Thanh toán cho người bán</p>
                  <p className="text-sm font-semibold text-success">T+3 sau khi giao thành công</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Section 8 */}
          <Card id="s8" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiBookOpen} title="8. Sở hữu trí tuệ" />
              <p className="text-sm text-default-600 leading-relaxed mb-3">
                Toàn bộ nội dung trên DFS.vn bao gồm logo, giao diện, mã nguồn,
                bài viết, hình ảnh và tài nguyên số thuộc quyền sở hữu của Công
                ty TNHH DFS Việt Nam hoặc đối tác cấp phép.
              </p>
              <NoList
                items={[
                  "Nghiêm cấm sao chép, phân phối hoặc sử dụng thương mại nội dung khi chưa được cho phép bằng văn bản.",
                  "Người bán đảm bảo hình ảnh sản phẩm không vi phạm bản quyền của bên thứ ba.",
                  "Vi phạm sở hữu trí tuệ sẽ bị xử lý theo quy định pháp luật hiện hành.",
                ]}
              />
            </CardBody>
          </Card>

          {/* Section 9 */}
          <Card id="s9" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiAlertTriangle} title="9. Giới hạn trách nhiệm" />
              <p className="text-sm text-default-600 leading-relaxed mb-3">
                DFS.vn đóng vai trò là nền tảng trung gian kết nối người mua và
                người bán. Chúng tôi không phải bên trực tiếp cung cấp sản phẩm
                trong các giao dịch giữa người dùng.
              </p>
              <BulletList
                items={[
                  "DFS.vn không chịu trách nhiệm về thiệt hại gián tiếp phát sinh ngoài phạm vi đã quy định.",
                  "DFS.vn không đảm bảo dịch vụ hoạt động liên tục 100% và có quyền bảo trì theo thông báo trước.",
                  "Tranh chấp giữa người mua và người bán được giải quyết qua cơ chế khiếu nại nội bộ trước.",
                ]}
              />
            </CardBody>
          </Card>

          {/* Section 10 */}
          <Card id="s10" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiEdit3} title="10. Sửa đổi điều khoản" />
              <p className="text-sm text-default-600 leading-relaxed">
                DFS.vn có quyền cập nhật, sửa đổi các điều khoản bất kỳ lúc
                nào. Mọi thay đổi quan trọng sẽ được thông báo qua email đăng
                ký hoặc thông báo trên website/ứng dụng ít nhất{" "}
                <span className="font-semibold text-primary">7 ngày</span> trước
                khi áp dụng. Việc tiếp tục sử dụng dịch vụ sau ngày áp dụng
                đồng nghĩa với việc chấp nhận các thay đổi đó.
              </p>
            </CardBody>
          </Card>

          {/* Section 11 */}
          <Card id="s11" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiPhone} title="11. Liên hệ & hỗ trợ" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Email hỗ trợ", value: "support@dfs.vn", color: "text-primary" },
                  { label: "Hotline (8:00 – 22:00)", value: "1800 6789 (miễn phí)", color: "text-success" },
                  { label: "Trụ sở chính", value: "Tầng 12, 123 Lê Văn Lương, Hà Nội", color: "text-default-700" },
                  { label: "Thời gian phản hồi", value: "Trong vòng 24 giờ làm việc", color: "text-default-700" },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-default-50 rounded-lg border border-default-200">
                    <p className="text-xs text-default-400 mb-1">{item.label}</p>
                    <p className={`text-sm font-medium ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-default-400 py-2">
            <p>Công ty TNHH DFS Việt Nam · MST: 0123456789</p>
            <p className="mt-1">© 2026 DFS.vn. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
