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
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import {
  FiShield,
  FiDatabase,
  FiEye,
  FiUserCheck,
  FiShare2,
  FiLock,
  FiClock,
  FiSliders,
  FiGlobe,
  FiRefreshCw,
  FiPhone,
  FiCheckCircle,
  FiAlertTriangle,
  FiInfo,
} from "react-icons/fi";

const UPDATED_DATE = "13/03/2026";

const TOC = [
  { id: "p1", label: "Cam kết bảo mật" },
  { id: "p2", label: "Dữ liệu thu thập" },
  { id: "p3", label: "Mục đích sử dụng" },
  { id: "p4", label: "Chia sẻ dữ liệu" },
  { id: "p5", label: "Bảo mật kỹ thuật" },
  { id: "p6", label: "Lưu trữ & xóa dữ liệu" },
  { id: "p7", label: "Quyền của người dùng" },
  { id: "p8", label: "Cookie & theo dõi" },
  { id: "p9", label: "Dữ liệu trẻ em" },
  { id: "p10", label: "Chuyển dữ liệu quốc tế" },
  { id: "p11", label: "Cập nhật chính sách" },
  { id: "p12", label: "Liên hệ DPO" },
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

const SectionTitle = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="p-1.5 rounded-lg bg-secondary/10">
      <Icon size={16} className="text-secondary" />
    </div>
    <h2 className="text-base font-semibold text-default-900">{title}</h2>
  </div>
);

const RightItem = ({ title, desc }) => (
  <div className="p-3 bg-default-50 rounded-lg border border-default-200">
    <p className="text-sm font-medium text-default-800 mb-1">{title}</p>
    <p className="text-xs text-default-500 leading-relaxed">{desc}</p>
  </div>
);

const PrivacyPolicy = () => {
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
            <div className="p-3 rounded-2xl bg-secondary/10">
              <FiShield size={28} className="text-secondary" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-secondary mb-1">
            Chính Sách Bảo Mật
          </h1>
          <p className="text-sm text-default-500 mb-3">
            Cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của người dùng DFS.vn
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Chip size="sm" variant="flat" color="secondary">
              Cập nhật: {UPDATED_DATE}
            </Chip>
            <Chip size="sm" variant="flat" color="success">
              Tuân thủ NĐ 13/2023/NĐ-CP
            </Chip>
            <Chip size="sm" variant="flat" color="default">
              GDPR Compatible
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
                          ? "bg-secondary text-white font-medium"
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
          <Card id="p1" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiShield} title="1. Cam kết bảo mật" />
              <p className="text-sm text-default-600 leading-relaxed">
                DFS.vn cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của
                người dùng theo đúng quy định tại Nghị định 13/2023/NĐ-CP về
                bảo vệ dữ liệu cá nhân và các quy định pháp luật liên quan của
                Việt Nam.
              </p>
              <InfoBox
                icon={FiInfo}
                colorClass="text-secondary"
                bgClass="bg-secondary/5 border border-secondary/20"
              >
                Chúng tôi không bán, cho thuê hoặc trao đổi dữ liệu cá nhân
                của bạn cho bên thứ ba vì bất kỳ mục đích thương mại nào.
              </InfoBox>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: "Mã hóa", value: "SSL/TLS 256-bit" },
                  { label: "Tiêu chuẩn", value: "ISO 27001" },
                  { label: "Kiểm toán", value: "Hàng quý" },
                ].map((item) => (
                  <div key={item.label} className="p-2 bg-default-50 rounded-lg border border-default-200 text-center">
                    <p className="text-xs text-default-400">{item.label}</p>
                    <p className="text-xs font-semibold text-secondary mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Section 2 */}
          <Card id="p2" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiDatabase} title="2. Dữ liệu chúng tôi thu thập" />
              <Accordion variant="light" isCompact>
                <AccordionItem
                  key="direct"
                  title={
                    <span className="text-sm font-medium text-default-700">
                      Dữ liệu bạn cung cấp trực tiếp
                    </span>
                  }
                >
                  <BulletList
                    items={[
                      "Họ tên, ngày sinh, giới tính khi đăng ký tài khoản.",
                      "Số điện thoại và địa chỉ email để xác thực và liên lạc.",
                      "Địa chỉ giao hàng (tỉnh/thành, quận/huyện, số nhà).",
                      "Thông tin thanh toán (được mã hóa, không lưu số thẻ đầy đủ).",
                      "Ảnh đại diện và thông tin hồ sơ cá nhân (không bắt buộc).",
                    ]}
                  />
                </AccordionItem>
                <AccordionItem
                  key="auto"
                  title={
                    <span className="text-sm font-medium text-default-700">
                      Dữ liệu thu thập tự động
                    </span>
                  }
                >
                  <BulletList
                    items={[
                      "Địa chỉ IP, loại thiết bị, hệ điều hành và phiên bản trình duyệt.",
                      "Lịch sử duyệt sản phẩm, tìm kiếm và thời gian tương tác.",
                      "Dữ liệu cookie và mã theo dõi phiên đăng nhập.",
                      "Dữ liệu vị trí gần đúng (nếu người dùng cấp phép).",
                    ]}
                  />
                </AccordionItem>
                <AccordionItem
                  key="third"
                  title={
                    <span className="text-sm font-medium text-default-700">
                      Dữ liệu từ bên thứ ba
                    </span>
                  }
                >
                  <BulletList
                    items={[
                      "Thông tin xác thực từ đăng nhập bằng Google, Facebook (chỉ email và tên).",
                      "Dữ liệu giao dịch từ đối tác cổng thanh toán để đối soát.",
                      "Xác nhận giao hàng từ đối tác logistics.",
                    ]}
                  />
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>

          {/* Section 3 */}
          <Card id="p3" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiEye} title="3. Mục đích sử dụng dữ liệu" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {[
                  { title: "Xử lý đơn hàng", desc: "Xác nhận, xử lý và giao nhận đơn hàng cho người mua." },
                  { title: "Xác thực danh tính", desc: "Bảo mật tài khoản, phòng chống gian lận và lừa đảo." },
                  { title: "Hỗ trợ khách hàng", desc: "Giải quyết khiếu nại, tranh chấp và phản hồi ý kiến." },
                  { title: "Cá nhân hóa trải nghiệm", desc: "Gợi ý sản phẩm và khuyến mãi phù hợp với sở thích." },
                  { title: "Phân tích & cải thiện", desc: "Nghiên cứu hành vi người dùng để nâng cấp dịch vụ." },
                  { title: "Thông báo marketing", desc: "Gửi email/SMS khuyến mãi (chỉ khi có sự đồng ý)." },
                ].map((item) => (
                  <RightItem key={item.title} title={item.title} desc={item.desc} />
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Section 4 */}
          <Card id="p4" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiShare2} title="4. Chia sẻ dữ liệu với bên thứ ba" />
              <p className="text-sm text-default-600 mb-3">
                DFS.vn chỉ chia sẻ dữ liệu cá nhân trong các trường hợp sau:
              </p>
              <Table
                aria-label="Bảng chia sẻ dữ liệu"
                removeWrapper
                isCompact
                classNames={{ th: "bg-default-100 text-default-600 text-xs", td: "text-xs text-default-600 py-2" }}
              >
                <TableHeader>
                  <TableColumn>Đối tác</TableColumn>
                  <TableColumn>Dữ liệu chia sẻ</TableColumn>
                  <TableColumn>Mục đích</TableColumn>
                </TableHeader>
                <TableBody>
                  {[
                    { partner: "Đơn vị vận chuyển", data: "Tên, SĐT, địa chỉ", purpose: "Giao nhận hàng hóa" },
                    { partner: "Cổng thanh toán", data: "Mã giao dịch, số tiền", purpose: "Xử lý thanh toán" },
                    { partner: "Cơ quan nhà nước", data: "Theo yêu cầu pháp lý", purpose: "Tuân thủ pháp luật" },
                    { partner: "Google Analytics", data: "Dữ liệu ẩn danh", purpose: "Phân tích hành vi" },
                  ].map((row) => (
                    <TableRow key={row.partner}>
                      <TableCell className="font-medium">{row.partner}</TableCell>
                      <TableCell>{row.data}</TableCell>
                      <TableCell>{row.purpose}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <InfoBox
                icon={FiAlertTriangle}
                colorClass="text-warning-700"
                bgClass="bg-warning-50 border border-warning-200"
              >
                Tất cả đối tác của DFS.vn đều ký cam kết bảo mật dữ liệu và chỉ
                được phép sử dụng dữ liệu đúng mục đích đã thỏa thuận.
              </InfoBox>
            </CardBody>
          </Card>

          {/* Section 5 */}
          <Card id="p5" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiLock} title="5. Biện pháp bảo mật kỹ thuật" />
              <BulletList
                items={[
                  "Toàn bộ dữ liệu truyền tải được mã hóa bằng TLS 1.3 / SSL 256-bit.",
                  "Mật khẩu được lưu trữ dưới dạng hash bcrypt, không lưu plaintext.",
                  "Hệ thống kiểm tra xâm nhập (penetration testing) định kỳ hàng quý.",
                  "Kiến trúc phân quyền (least privilege) – nhân viên chỉ truy cập dữ liệu theo phạm vi công việc.",
                  "Giám sát 24/7 với hệ thống phát hiện bất thường và phản ứng sự cố tự động.",
                  "Dữ liệu sao lưu định kỳ trên hạ tầng đám mây đa vùng đạt chuẩn ISO 27001.",
                ]}
              />
            </CardBody>
          </Card>

          {/* Section 6 */}
          <Card id="p6" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiClock} title="6. Lưu trữ & xóa dữ liệu" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {[
                  { label: "Dữ liệu tài khoản", value: "Trong suốt thời gian tài khoản còn hoạt động" },
                  { label: "Lịch sử giao dịch", value: "Tối thiểu 5 năm theo quy định kế toán" },
                  { label: "Log truy cập", value: "90 ngày kể từ ngày tạo" },
                  { label: "Sau khi xóa tài khoản", value: "Xóa hoàn toàn trong 30 ngày làm việc" },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-default-50 rounded-lg border border-default-200">
                    <p className="text-xs text-default-400 mb-1">{item.label}</p>
                    <p className="text-sm font-medium text-default-700">{item.value}</p>
                  </div>
                ))}
              </div>
              <InfoBox
                icon={FiInfo}
                colorClass="text-secondary"
                bgClass="bg-secondary/5 border border-secondary/20"
              >
                Sau khi tài khoản bị xóa, một số dữ liệu có thể được giữ lại
                dưới dạng ẩn danh phục vụ mục đích thống kê và tuân thủ pháp
                luật theo thời hạn quy định.
              </InfoBox>
            </CardBody>
          </Card>

          {/* Section 7 */}
          <Card id="p7" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiUserCheck} title="7. Quyền của người dùng đối với dữ liệu" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    title: "Quyền truy cập",
                    desc: "Yêu cầu xem toàn bộ dữ liệu cá nhân DFS.vn đang lưu trữ về bạn.",
                  },
                  {
                    title: "Quyền chỉnh sửa",
                    desc: "Cập nhật hoặc sửa chữa dữ liệu cá nhân không chính xác.",
                  },
                  {
                    title: "Quyền xóa dữ liệu",
                    desc: "Yêu cầu xóa dữ liệu khi không còn cần thiết hoặc khi rút lại đồng ý.",
                  },
                  {
                    title: "Quyền phản đối",
                    desc: "Phản đối việc xử lý dữ liệu cho mục đích marketing trực tiếp.",
                  },
                  {
                    title: "Quyền di chuyển",
                    desc: "Nhận bản sao dữ liệu của bạn ở định dạng có thể đọc được (JSON/CSV).",
                  },
                  {
                    title: "Quyền hạn chế",
                    desc: "Yêu cầu tạm dừng xử lý dữ liệu trong khi xem xét khiếu nại.",
                  },
                ].map((item) => (
                  <RightItem key={item.title} title={item.title} desc={item.desc} />
                ))}
              </div>
              <InfoBox
                icon={FiInfo}
                colorClass="text-secondary"
                bgClass="bg-secondary/5 border border-secondary/20"
              >
                Để thực hiện bất kỳ quyền nào ở trên, gửi yêu cầu đến{" "}
                <strong>privacy@dfs.vn</strong>. Chúng tôi sẽ phản hồi trong
                vòng 30 ngày làm việc.
              </InfoBox>
            </CardBody>
          </Card>

          {/* Section 8 */}
          <Card id="p8" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiSliders} title="8. Cookie & công nghệ theo dõi" />
              <p className="text-sm text-default-600 leading-relaxed mb-3">
                DFS.vn sử dụng cookie và các công nghệ theo dõi tương tự để
                cải thiện trải nghiệm người dùng và phân tích hiệu quả dịch vụ.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  { label: "Cookie thiết yếu", color: "success" },
                  { label: "Cookie phân tích", color: "primary" },
                  { label: "Cookie tiếp thị", color: "warning" },
                  { label: "Cookie tùy chọn", color: "secondary" },
                ].map((item) => (
                  <Chip key={item.label} size="sm" variant="flat" color={item.color}>
                    {item.label}
                  </Chip>
                ))}
              </div>
              <BulletList
                items={[
                  "Cookie thiết yếu không thể tắt vì đây là nền tảng để website hoạt động.",
                  "Người dùng có thể từ chối cookie phân tích và tiếp thị trong phần Cài đặt tài khoản.",
                  "Xóa cookie trong trình duyệt sẽ không xóa dữ liệu đã được lưu trên server.",
                ]}
              />
            </CardBody>
          </Card>

          {/* Section 9 */}
          <Card id="p9" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiShield} title="9. Bảo vệ dữ liệu trẻ em" />
              <p className="text-sm text-default-600 leading-relaxed">
                DFS.vn không cố ý thu thập dữ liệu cá nhân của người dưới 15
                tuổi mà không có sự đồng ý của cha mẹ hoặc người giám hộ hợp
                pháp. Người dưới 18 tuổi cần sự giám sát của người lớn khi sử
                dụng dịch vụ.
              </p>
              <InfoBox
                icon={FiAlertTriangle}
                colorClass="text-danger-600"
                bgClass="bg-danger-50 border border-danger-200"
              >
                Nếu phát hiện tài khoản thuộc về trẻ em dưới 15 tuổi không có
                sự giám sát phù hợp, DFS.vn có quyền tạm khóa và yêu cầu xác
                minh trước khi tiếp tục.
              </InfoBox>
            </CardBody>
          </Card>

          {/* Section 10 */}
          <Card id="p10" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiGlobe} title="10. Chuyển dữ liệu quốc tế" />
              <p className="text-sm text-default-600 leading-relaxed">
                Trong một số trường hợp, dữ liệu của bạn có thể được lưu trữ
                hoặc xử lý trên các máy chủ đặt ngoài Việt Nam (ví dụ: hạ tầng
                đám mây AWS tại Singapore). Mọi việc chuyển dữ liệu đều đảm bảo
                tuân thủ quy định pháp lý và có biện pháp bảo vệ tương đương.
              </p>
              <BulletList
                items={[
                  "Chỉ sử dụng đối tác hạ tầng đạt chứng nhận ISO 27001, SOC 2 Type II.",
                  "Hợp đồng xử lý dữ liệu (DPA) được ký kết với tất cả đối tác nước ngoài.",
                  "Dữ liệu nhạy cảm được ưu tiên lưu trữ trong nước khi có hạ tầng phù hợp.",
                ]}
              />
            </CardBody>
          </Card>

          {/* Section 11 */}
          <Card id="p11" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiRefreshCw} title="11. Cập nhật chính sách bảo mật" />
              <p className="text-sm text-default-600 leading-relaxed">
                Chính sách này có thể được cập nhật định kỳ để phản ánh các
                thay đổi trong quy định pháp lý hoặc cải tiến quy trình nội bộ.
                Mọi thay đổi quan trọng sẽ được thông báo qua email đăng ký
                trước ít nhất{" "}
                <span className="font-semibold text-secondary">14 ngày</span>{" "}
                trước khi có hiệu lực. Phiên bản mới nhất luôn được đăng tải
                tại trang này với ngày cập nhật rõ ràng.
              </p>
            </CardBody>
          </Card>

          {/* Section 12 */}
          <Card id="p12" radius="xl" shadow="sm">
            <CardBody className="p-5">
              <SectionTitle icon={FiPhone} title="12. Liên hệ Cán bộ Bảo vệ Dữ liệu (DPO)" />
              <p className="text-sm text-default-600 mb-3">
                Mọi thắc mắc, yêu cầu hoặc khiếu nại liên quan đến bảo mật dữ
                liệu, vui lòng liên hệ Cán bộ Bảo vệ Dữ liệu của chúng tôi:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Email DPO", value: "privacy@dfs.vn", color: "text-secondary" },
                  { label: "Hotline bảo mật", value: "1800 6789 - phím 2", color: "text-success" },
                  { label: "Địa chỉ gửi thư", value: "P. Pháp chế, Tầng 12, 123 Lê Văn Lương, HN", color: "text-default-700" },
                  { label: "Thời gian xử lý", value: "Tối đa 30 ngày làm việc", color: "text-default-700" },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-default-50 rounded-lg border border-default-200">
                    <p className="text-xs text-default-400 mb-1">{item.label}</p>
                    <p className={`text-sm font-medium ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <InfoBox
                icon={FiInfo}
                colorClass="text-secondary"
                bgClass="bg-secondary/5 border border-secondary/20"
              >
                Nếu không hài lòng với cách xử lý của chúng tôi, bạn có quyền
                khiếu nại lên Cục An toàn thông tin – Bộ Thông tin và Truyền
                thông Việt Nam.
              </InfoBox>
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

export default PrivacyPolicy;
